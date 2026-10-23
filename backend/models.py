"""
SQLAlchemy 2.0 ORM Models for PropDesk Property Matcher.

Defines User, Property, Requirement, and MatchStatus tables for PostgreSQL (Neon)
and SQLite environments, used by both the application and Alembic migrations.
"""
from typing import List, Optional
import json

try:
    from sqlalchemy import (
        BigInteger,
        CheckConstraint,
        Column,
        ForeignKey,
        Index,
        Integer,
        String,
        Text,
        UniqueConstraint,
        TypeDecorator,
    )
    from sqlalchemy.dialects.postgresql import ARRAY
    from sqlalchemy.orm import declarative_base, relationship

    Base = declarative_base()

    class StringListType(TypeDecorator):
        """Stores a list of strings as PostgreSQL TEXT[] in Postgres and JSON array in SQLite."""
        impl = Text
        cache_ok = True

        def load_dialect_impl(self, dialect):
            if dialect.name == "postgresql":
                return dialect.type_descriptor(ARRAY(String))
            return dialect.type_descriptor(Text())

        def process_bind_param(self, value, dialect):
            if value is None:
                return None
            if dialect.name == "postgresql":
                return list(value)
            return json.dumps(list(value))

        def process_result_value(self, value, dialect):
            if value is None:
                return []
            if isinstance(value, list):
                return value
            return json.loads(value)

    class User(Base):
        __tablename__ = "users"

        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(120), nullable=False)
        email = Column(String(255), nullable=False, unique=True, index=True)
        password = Column(String(255), nullable=False)
        role = Column(String(20), nullable=False)  # 'manager' | 'agent'

        __table_args__ = (
            CheckConstraint("role IN ('manager', 'agent')", name="ck_users_role"),
        )

        requirements = relationship("Requirement", back_populates="agent")

    class Property(Base):
        __tablename__ = "properties"

        id = Column(Integer, primary_key=True, index=True)
        title = Column(String(255), nullable=False)
        locality = Column(String(120), nullable=False, index=True)
        deal = Column(String(20), nullable=False, index=True)  # 'sale' | 'rent'
        type = Column(String(20), nullable=False, index=True)  # 'flat' | 'house' | 'plot' | 'shop'
        bhk = Column(Integer, nullable=True)
        price = Column(BigInteger, nullable=False, index=True)

        __table_args__ = (
            CheckConstraint("deal IN ('sale', 'rent')", name="ck_properties_deal"),
            CheckConstraint("type IN ('flat', 'house', 'plot', 'shop')", name="ck_properties_type"),
            CheckConstraint("price > 0", name="ck_properties_price_positive"),
            CheckConstraint(
                "(type IN ('flat', 'house') AND bhk IS NOT NULL AND bhk > 0) OR "
                "(type IN ('plot', 'shop') AND bhk IS NULL)",
                name="ck_properties_bhk_by_type",
            ),
            Index("ix_properties_deal_type_price", "deal", "type", "price"),
        )

        match_statuses = relationship("MatchStatus", back_populates="property", cascade="all, delete-orphan")

    class Requirement(Base):
        __tablename__ = "requirements"

        id = Column(Integer, primary_key=True, index=True)
        client_name = Column(String(120), nullable=False)
        phone = Column(String(15), nullable=False)
        deal = Column(String(20), nullable=False, index=True)  # 'sale' | 'rent'
        type = Column(String(20), nullable=False, index=True)  # 'flat' | 'house' | 'plot' | 'shop'
        localities = Column(StringListType, nullable=False)
        bhk = Column(Integer, nullable=True)  # whole number or null = "any"
        budget_max = Column(BigInteger, nullable=False)
        assigned_to = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

        __table_args__ = (
            CheckConstraint("deal IN ('sale', 'rent')", name="ck_requirements_deal"),
            CheckConstraint("type IN ('flat', 'house', 'plot', 'shop')", name="ck_requirements_type"),
            CheckConstraint("budget_max > 0", name="ck_requirements_budget_positive"),
        )

        agent = relationship("User", back_populates="requirements")
        match_statuses = relationship("MatchStatus", back_populates="requirement", cascade="all, delete-orphan")

    class MatchStatus(Base):
        __tablename__ = "match_statuses"

        id = Column(Integer, primary_key=True, index=True)
        requirement_id = Column(
            Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True
        )
        property_id = Column(
            Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
        )
        status = Column(String(20), nullable=False)  # 'shared' | 'rejected'
        reason = Column(Text, nullable=True)

        __table_args__ = (
            UniqueConstraint("requirement_id", "property_id", name="uq_requirement_property_match"),
            CheckConstraint("status IN ('shared', 'rejected')", name="ck_match_statuses_status"),
            CheckConstraint(
                "(status = 'shared') OR (status = 'rejected' AND reason IS NOT NULL AND length(trim(reason)) > 0)",
                name="ck_match_statuses_reason",
            ),
        )

        requirement = relationship("Requirement", back_populates="match_statuses")
        property = relationship("Property", back_populates="match_statuses")

except ImportError:
    Base = None
    User = None
    Property = None
    Requirement = None
    MatchStatus = None
