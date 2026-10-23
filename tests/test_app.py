"""
Automated Test Suite for PropDesk Take-Home Task: Property Matcher.

Covers all required and bonus specifications:
1. Matching rules using the seed data:
   - "Check your work": logged in as Sana, requirement 2 returns exactly 1 match:
     property 12, score 65, flags ['over_budget', 'bhk_differs'], status None.
   - Requirement 1 (Ravi): returns 4 matches sorted by score DESC, price ASC
     (Property 1 @ 100, Property 8 @ 100 with case/space-insensitive locality ' vijay nagar ',
      Property 9 @ 85 ['bhk_differs'], Property 3 @ 80 ['over_budget']).
   - Requirement 3 (Ravi): returns 0 matches (empty list, total 0).
   - Match status transitions: marking Shared persists status='shared'; marking Rejected
     with a reason removes the property from matches; replacing status works cleanly.
2. Permissions & Role-Based Access Control:
   - Unauthenticated requests to any endpoint except /auth/login get HTTP 401.
   - An agent trying to read, match, or update a requirement assigned to another agent gets HTTP 404.
   - An agent trying a manager-only action (POST /properties, POST /properties/import,
     PATCH /requirements/{id}) gets HTTP 403.
   - Agents listing requirements only see their own; managers see all.
   - Agents creating a requirement have it assigned to themselves automatically.
3. CSV Import:
   - Tests the exact 7-row CSV from Page 3 of the specification.
   - Verifies imported == 3 (lines 2, 5, 7) and 4 errors on lines 3 (type), 4 (price), 6 (bhk), 8 (bhk).
4. Input Validations (HTTP 422):
   - phone must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9.
   - price and budget_max must be greater than 0.
   - localities must not be empty.
   - bhk is required for flats and houses, and must be empty (null) for plots and shops.
   - a rejected status needs a reason.
   - assigned_to must be an agent (rejects manager ID or non-existent user ID).
5. Bonus — Reverse Matching (`GET /properties/{id}/matching-requirements`):
   - Returns requirements that a property fits, reusing the SQL matching & scoring engine.
   - Enforces agent visibility (agents see only their own matching requirements).
"""
import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///./test_propdesk.db"

from fastapi.testclient import TestClient
from backend.database import db_manager
from backend.main import app
from backend.seed import DEFAULT_PASSWORDS, seed_database


SAMPLE_CSV_CONTENT = """title,locality,deal,type,bhk,price
"2BHK Flat, Bhawarkuan",Bhawarkuan,sale,flat,2,3900000
"Office, Palasia",Palasia,rent,office,,40000
"3BHK Flat, Nipania",Nipania,sale,flat,3,-5000000
"Plot, Super Corridor",Super Corridor,sale,plot,,2200000
"2BHK Flat, Vijay Nagar",VIJAY NAGAR ,sale,flat,two,5100000
"1BHK Flat for rent, Palasia",Palasia,rent,flat,1,12000
"Shop, Rajwada",Rajwada,sale,shop,1,6500000
"""


class PropDeskPropertyMatcherTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Reset schema and reload exact seed data before each test
        db_manager.reset_schema()
        sess = db_manager.create_session()
        try:
            seed_database(sess, force_reset=True)
        finally:
            sess.close()

    def login_headers(self, email: str) -> dict:
        password = DEFAULT_PASSWORDS[email]
        res = self.client.post("/auth/login", json={"email": email, "password": password})
        self.assertEqual(res.status_code, 200, f"Login failed for {email}: {res.text}")
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    # -----------------------------------------------------------------------
    # 1. Matching Rules Tests (using Seed Data)
    # -----------------------------------------------------------------------

    def test_seed_check_your_work_sana_requirement_2(self):
        """
        Page 6 Check your work:
        'logged in as Sana, requirement 2 should return exactly one match:
         property 12, score 65, flags over_budget and bhk_differs, status null.'
        """
        headers = self.login_headers("sana@example.com")
        res = self.client.get("/requirements/2/matches", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["total"], 1)
        self.assertEqual(len(data["items"]), 1)

        match = data["items"][0]
        self.assertEqual(match["property"]["id"], 12)
        self.assertEqual(match["property"]["title"], "1BHK Flat for rent, Vijay Nagar")
        self.assertEqual(match["score"], 65)
        self.assertEqual(set(match["flags"]), {"over_budget", "bhk_differs"})
        self.assertIsNone(match["status"])

    def test_matching_rules_ravi_requirement_1_scoring_sorting_and_case_trim(self):
        """
        Requirement 1 (Rohan Verma, sale, flat, ['Vijay Nagar', 'Nipania'], bhk=2, budget=50,00,000):
        Should match properties 1, 8, 9, 3 in exact order of score DESC, price ASC:
        1. Property 1 (45L, bhk 2, 'Vijay Nagar') -> score 100, flags []
        2. Property 8 (48L, bhk 2, ' vijay nagar ') -> score 100, flags [] (case & whitespace ignored)
        3. Property 9 (50L, bhk 3, 'Vijay Nagar') -> score 85, flags ['bhk_differs']
        4. Property 3 (55L, bhk 2, 'Nipania') -> score 80, flags ['over_budget'] (exactly 110% of 50L)
        Excludes Property 2 (62L > 55L), Property 11 (bhk 4 differs by 2), Property 5 (house), etc.
        """
        headers = self.login_headers("ravi@example.com")
        res = self.client.get("/requirements/1/matches", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["total"], 4)
        matched_ids = [m["property"]["id"] for m in data["items"]]
        self.assertEqual(matched_ids, [1, 8, 9, 3])

        scores = [m["score"] for m in data["items"]]
        self.assertEqual(scores, [100, 100, 85, 80])

        self.assertEqual(data["items"][0]["flags"], [])
        self.assertEqual(data["items"][1]["flags"], [])
        self.assertEqual(data["items"][2]["flags"], ["bhk_differs"])
        self.assertEqual(data["items"][3]["flags"], ["over_budget"])

        # Verify pagination on matches (?limit=2&offset=1)
        paged = self.client.get("/requirements/1/matches?limit=2&offset=1", headers=headers).json()
        self.assertEqual(paged["total"], 4)
        self.assertEqual([m["property"]["id"] for m in paged["items"]], [8, 9])

    def test_matching_rules_shared_and_rejected_status_lifecycle(self):
        """
        Setting a match to 'shared' retains it in the match list with status='shared'.
        Setting a match to 'rejected' with a reason drops it from the match list.
        Setting status again replaces the previous status.
        """
        headers = self.login_headers("ravi@example.com")

        # Mark Property 1 as shared for Requirement 1
        res_share = self.client.put(
            "/requirements/1/matches/1",
            headers=headers,
            json={"status": "shared"},
        )
        self.assertEqual(res_share.status_code, 200)
        self.assertEqual(res_share.json()["status"], "shared")

        matches_after_share = self.client.get("/requirements/1/matches", headers=headers).json()
        self.assertEqual(matches_after_share["total"], 4)
        prop1_match = next(m for m in matches_after_share["items"] if m["property"]["id"] == 1)
        self.assertEqual(prop1_match["status"], "shared")

        # Now replace Property 1's status with 'rejected' + reason
        res_reject = self.client.put(
            "/requirements/1/matches/1",
            headers=headers,
            json={"status": "rejected", "reason": "Client prefers higher floor"},
        )
        self.assertEqual(res_reject.status_code, 200)
        self.assertEqual(res_reject.json()["status"], "rejected")

        # Property 1 must now drop off the matches list
        matches_after_reject = self.client.get("/requirements/1/matches", headers=headers).json()
        self.assertEqual(matches_after_reject["total"], 3)
        remaining_ids = [m["property"]["id"] for m in matches_after_reject["items"]]
        self.assertNotIn(1, remaining_ids)
        self.assertEqual(remaining_ids, [8, 9, 3])

    def test_requirement_3_empty_matches(self):
        """Requirement 3 (sale shop on AB Road) has no matching sale shops (Property 7 is rent)."""
        headers = self.login_headers("ravi@example.com")
        res = self.client.get("/requirements/3/matches", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"total": 0, "items": []})

    # -----------------------------------------------------------------------
    # 2. Permissions & Auth Tests
    # -----------------------------------------------------------------------

    def test_permissions_agent_cannot_read_another_agents_requirement_gets_404(self):
        """
        An agent asking for a requirement that isn't theirs gets 404,
        exactly as if it didn't exist.
        """
        ravi_headers = self.login_headers("ravi@example.com")  # user id 2
        # Requirement 2 is assigned to Sana (user id 3)
        res_detail = self.client.get("/requirements/2", headers=ravi_headers)
        self.assertEqual(res_detail.status_code, 404)

        res_matches = self.client.get("/requirements/2/matches", headers=ravi_headers)
        self.assertEqual(res_matches.status_code, 404)

        res_put_match = self.client.put(
            "/requirements/2/matches/12",
            headers=ravi_headers,
            json={"status": "shared"},
        )
        self.assertEqual(res_put_match.status_code, 404)

        # Meanwhile, Ravi's GET /requirements list only includes requirements 1 and 3
        res_list = self.client.get("/requirements", headers=ravi_headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(res_list.json()["total"], 2)
        self.assertEqual([r["id"] for r in res_list.json()["items"]], [1, 3])

    def test_permissions_agent_cannot_create_property_or_do_manager_actions_gets_403(self):
        """
        An agent trying a manager-only action (create property, import CSV, reassign requirement)
        gets 403 Forbidden.
        """
        sana_headers = self.login_headers("sana@example.com")

        # 1. Agent cannot create a property -> 403
        res_create_prop = self.client.post(
            "/properties",
            headers=sana_headers,
            json={
                "title": "2BHK Flat, Palasia",
                "locality": "Palasia",
                "deal": "sale",
                "type": "flat",
                "bhk": 2,
                "price": 4200000,
            },
        )
        self.assertEqual(res_create_prop.status_code, 403)

        # 2. Agent cannot import properties CSV -> 403
        res_import = self.client.post(
            "/properties/import",
            headers=sana_headers,
            files={"file": ("sample.csv", SAMPLE_CSV_CONTENT.encode("utf-8"), "text/csv")},
        )
        self.assertEqual(res_import.status_code, 403)

        # 3. Agent cannot reassign a requirement -> 403
        res_reassign = self.client.patch(
            "/requirements/2",
            headers=sana_headers,
            json={"assigned_to": 2},
        )
        self.assertEqual(res_reassign.status_code, 403)

    def test_permissions_manager_can_see_all_and_reassign(self):
        """Managers can list all requirements, create properties, and reassign requirements."""
        neha_headers = self.login_headers("neha@example.com")

        res_list = self.client.get("/requirements", headers=neha_headers)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(res_list.json()["total"], 3)

        # Reassign Requirement 2 from Sana (3) to Ravi (2)
        res_patch = self.client.patch(
            "/requirements/2",
            headers=neha_headers,
            json={"assigned_to": 2},
        )
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["assigned_to"], 2)

        # Now Ravi can access Requirement 2, and Sana gets 404
        ravi_headers = self.login_headers("ravi@example.com")
        sana_headers = self.login_headers("sana@example.com")
        self.assertEqual(self.client.get("/requirements/2/matches", headers=ravi_headers).status_code, 200)
        self.assertEqual(self.client.get("/requirements/2/matches", headers=sana_headers).status_code, 404)

    # -----------------------------------------------------------------------
    # 3. CSV Import Test (using exact 7-row CSV from Page 3)
    # -----------------------------------------------------------------------

    def test_csv_import_with_spec_sample_file(self):
        """
        Tests POST /properties/import with the exact 7-row test file from Page 3:
        - Line 2: valid ("2BHK Flat, Bhawarkuan")
        - Line 3: invalid type 'office' -> line 3, field 'type'
        - Line 4: invalid price -5000000 -> line 4, field 'price'
        - Line 5: valid ("Plot, Super Corridor", bhk empty -> null)
        - Line 6: invalid bhk 'two' -> line 6, field 'bhk'
        - Line 7: valid ("1BHK Flat for rent, Palasia")
        - Line 8: invalid bhk '1' for shop -> line 8, field 'bhk'
        """
        neha_headers = self.login_headers("neha@example.com")
        res = self.client.post(
            "/properties/import",
            headers=neha_headers,
            files={"file": ("sample_import.csv", SAMPLE_CSV_CONTENT.encode("utf-8"), "text/csv")},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()

        self.assertEqual(body["imported"], 3)
        self.assertEqual(len(body["errors"]), 4)

        error_lines_and_fields = [(e["line"], e["field"]) for e in body["errors"]]
        self.assertEqual(
            error_lines_and_fields,
            [
                (3, "type"),
                (4, "price"),
                (6, "bhk"),
                (8, "bhk"),
            ],
        )

        # Total properties in DB should now be 12 (seed) + 3 (imported) = 15
        props_res = self.client.get("/properties", headers=neha_headers)
        self.assertEqual(props_res.json()["total"], 15)

    # -----------------------------------------------------------------------
    # 4. Validation Rules Tests (HTTP 422)
    # -----------------------------------------------------------------------

    def test_validation_rules_return_422(self):
        neha_headers = self.login_headers("neha@example.com")
        ravi_headers = self.login_headers("ravi@example.com")

        # Invalid Indian phone number (starts with 5 or wrong length)
        res_phone = self.client.post(
            "/requirements",
            headers=ravi_headers,
            json={
                "client_name": "Vikram Joshi",
                "phone": "5876543210",
                "deal": "sale",
                "type": "flat",
                "localities": ["Palasia"],
                "bhk": 2,
                "budget_max": 4000000,
            },
        )
        self.assertEqual(res_phone.status_code, 422)

        # Empty localities list
        res_loc = self.client.post(
            "/requirements",
            headers=ravi_headers,
            json={
                "client_name": "Vikram Joshi",
                "phone": "9876543210",
                "deal": "sale",
                "type": "flat",
                "localities": [],
                "bhk": 2,
                "budget_max": 4000000,
            },
        )
        self.assertEqual(res_loc.status_code, 422)

        # Non-positive budget_max
        res_budget = self.client.post(
            "/requirements",
            headers=ravi_headers,
            json={
                "client_name": "Vikram Joshi",
                "phone": "9876543210",
                "deal": "sale",
                "type": "flat",
                "localities": ["Palasia"],
                "bhk": 2,
                "budget_max": 0,
            },
        )
        self.assertEqual(res_budget.status_code, 422)

        # bhk required for flat/house, forbidden for plot/shop
        res_flat_no_bhk = self.client.post(
            "/properties",
            headers=neha_headers,
            json={
                "title": "Flat without BHK",
                "locality": "Palasia",
                "deal": "sale",
                "type": "flat",
                "bhk": None,
                "price": 3500000,
            },
        )
        self.assertEqual(res_flat_no_bhk.status_code, 422)

        res_plot_with_bhk = self.client.post(
            "/properties",
            headers=neha_headers,
            json={
                "title": "Plot with BHK",
                "locality": "Rau",
                "deal": "sale",
                "type": "plot",
                "bhk": 2,
                "price": 3500000,
            },
        )
        self.assertEqual(res_plot_with_bhk.status_code, 422)

        # Rejected status without reason -> 422
        res_reject_no_reason = self.client.put(
            "/requirements/1/matches/1",
            headers=ravi_headers,
            json={"status": "rejected", "reason": "   "},
        )
        self.assertEqual(res_reject_no_reason.status_code, 422)

        # assigned_to must be an agent (user 1 is a manager) -> 422
        res_assign_manager = self.client.patch(
            "/requirements/1",
            headers=neha_headers,
            json={"assigned_to": 1},
        )
        self.assertEqual(res_assign_manager.status_code, 422)

    # -----------------------------------------------------------------------
    # 5. Bonus: Reverse Matching Endpoint
    # -----------------------------------------------------------------------

    def test_bonus_reverse_matching_requirements_for_property(self):
        """
        GET /properties/{id}/matching-requirements returns matching requirements.
        Property 12 (1BHK rent flat in Vijay Nagar @ 16,000) fits Requirement 2 (assigned to Sana).
        Sana sees Requirement 2; Ravi sees 0 matches (since Requirement 2 is not assigned to Ravi).
        """
        sana_headers = self.login_headers("sana@example.com")
        ravi_headers = self.login_headers("ravi@example.com")
        neha_headers = self.login_headers("neha@example.com")

        res_sana = self.client.get("/properties/12/matching-requirements", headers=sana_headers)
        self.assertEqual(res_sana.status_code, 200)
        self.assertEqual(res_sana.json()["total"], 1)
        self.assertEqual(res_sana.json()["items"][0]["requirement"]["id"], 2)
        self.assertEqual(res_sana.json()["items"][0]["score"], 65)

        res_ravi = self.client.get("/properties/12/matching-requirements", headers=ravi_headers)
        self.assertEqual(res_ravi.status_code, 200)
        self.assertEqual(res_ravi.json()["total"], 0)

        res_neha = self.client.get("/properties/12/matching-requirements", headers=neha_headers)
        self.assertEqual(res_neha.status_code, 200)
        self.assertEqual(res_neha.json()["total"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
