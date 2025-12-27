from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    profession = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    photo_url = Column(String(500), nullable=True)
    consent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"


class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BlacklistedToken(token='{self.token[:20]}...', expires_at='{self.expires_at}')>"


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    creator_name = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tabs = None

    def __repr__(self):
        return f"<Community(id={self.id}, title='{self.title}', creator_id={self.creator_id})>"


class CommunityTab(Base):
    __tablename__ = "community_tabs"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    color = Column(String(7), nullable=False)  # Hex color code
    description = Column(Text, nullable=True)
    tab_form_structure = Column(JSON, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<CommunityTab(id={self.id}, name='{self.name}', community_id={self.community_id})>"


class InputContribution(Base):
    __tablename__ = "input_contributions"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(200), nullable=False, index=True)  # Creator username
    tab_id = Column(Integer, ForeignKey("community_tabs.id", ondelete="CASCADE"), nullable=False, index=True)
    space_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    input_list = Column(JSON, nullable=False)  # JSON array storing all input details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tab = relationship("CommunityTab", back_populates="input_contributions")
    space = relationship("Community", back_populates="input_contributions")

    def __repr__(self):
        return f"<InputContribution(id={self.id}, username='{self.username}', tab_id={self.tab_id}, space_id={self.space_id})>"


# Set up relationships after all models are defined
Community.tabs = relationship(
    "CommunityTab",
    back_populates="community",
    cascade="all, delete-orphan",
    order_by="CommunityTab.display_order"
)

CommunityTab.community = relationship("Community", back_populates="tabs")
CommunityTab.input_contributions = relationship(
    "InputContribution",
    back_populates="tab",
    cascade="all, delete-orphan"
)

Community.input_contributions = relationship(
    "InputContribution",
    back_populates="space",
    cascade="all, delete-orphan"
)


