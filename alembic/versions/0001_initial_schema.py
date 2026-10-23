"""Initial schema for PropDesk Property Matcher (users, properties, requirements, match_statuses).

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-10-23 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.CheckConstraint("role IN ('manager', 'agent')", name="ck_users_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "properties",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("locality", sa.String(length=120), nullable=False),
        sa.Column("deal", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("bhk", sa.Integer(), nullable=True),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("deal IN ('sale', 'rent')", name="ck_properties_deal"),
        sa.CheckConstraint("type IN ('flat', 'house', 'plot', 'shop')", name="ck_properties_type"),
        sa.CheckConstraint("price > 0", name="ck_properties_price_positive"),
        sa.CheckConstraint(
            "(type IN ('flat', 'house') AND bhk IS NOT NULL AND bhk > 0) OR "
            "(type IN ('plot', 'shop') AND bhk IS NULL)",
            name="ck_properties_bhk_by_type",
        ),
    )
    op.create_index("ix_properties_deal_type_price", "properties", ["deal", "type", "price"])

    op.create_table(
        "requirements",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("client_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=15), nullable=False),
        sa.Column("deal", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("localities", sa.Text(), nullable=False),
        sa.Column("bhk", sa.Integer(), nullable=True),
        sa.Column("budget_max", sa.BigInteger(), nullable=False),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.CheckConstraint("deal IN ('sale', 'rent')", name="ck_requirements_deal"),
        sa.CheckConstraint("type IN ('flat', 'house', 'plot', 'shop')", name="ck_requirements_type"),
        sa.CheckConstraint("budget_max > 0", name="ck_requirements_budget_positive"),
    )
    op.create_index("ix_requirements_assigned_to", "requirements", ["assigned_to"])

    op.create_table(
        "match_statuses",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "requirement_id",
            sa.Integer(),
            sa.ForeignKey("requirements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "property_id",
            sa.Integer(),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.UniqueConstraint("requirement_id", "property_id", name="uq_requirement_property_match"),
        sa.CheckConstraint("status IN ('shared', 'rejected')", name="ck_match_statuses_status"),
    )
    op.create_index("ix_match_statuses_req_prop", "match_statuses", ["requirement_id", "property_id"])


def downgrade() -> None:
    op.drop_table("match_statuses")
    op.drop_table("requirements")
    op.drop_table("properties")
    op.drop_table("users")
