from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, Text
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

    # Relationships - defined after all models are declared
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
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships - defined after all models are declared
    input_types = None

    def __repr__(self):
        return f"<CommunityTab(id={self.id}, name='{self.name}', community_id={self.community_id})>"


class InputType(Base):
    __tablename__ = "input_types"

    id = Column(Integer, primary_key=True, index=True)
    tab_id = Column(Integer, ForeignKey("community_tabs.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'free text', 'dropdown list', 'multiple select'
    name = Column(String(200), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships - will be set after InputTypeItem is defined
    items = None

    def __repr__(self):
        return f"<InputType(id={self.id}, type='{self.type}', name='{self.name}', tab_id={self.tab_id})>"


class InputTypeItem(Base):
    __tablename__ = "input_type_items"

    id = Column(Integer, primary_key=True, index=True)
    input_type_id = Column(Integer, ForeignKey("input_types.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(String(500), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    input_type = relationship("InputType", back_populates="items")

    def __repr__(self):
        return f"<InputTypeItem(id={self.id}, value='{self.value}', input_type_id={self.input_type_id})>"


class CommunityInput(Base):
    __tablename__ = "community_inputs"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    tab_id = Column(Integer, ForeignKey("community_tabs.id", ondelete="CASCADE"), nullable=False, index=True)
    input_type_id = Column(Integer, ForeignKey("input_types.id", ondelete="CASCADE"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    details = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships - will be set after all models are defined
    community = None
    tab = None
    input_type = None
    creator = None

    def __repr__(self):
        return f"<CommunityInput(id={self.id}, community_id={self.community_id}, creator_id={self.creator_id})>"


# Set up relationships after all models are defined
Community.tabs = relationship(
    "CommunityTab",
    back_populates="community",
    cascade="all, delete-orphan",
    order_by="CommunityTab.display_order"
)

CommunityTab.community = relationship("Community", back_populates="tabs")
CommunityTab.input_types = relationship(
    "InputType",
    back_populates="tab",
    cascade="all, delete-orphan",
    order_by="InputType.display_order"
)

InputType.tab = relationship("CommunityTab", back_populates="input_types")
InputType.items = relationship(
    "InputTypeItem",
    back_populates="input_type",
    cascade="all, delete-orphan",
    order_by="InputTypeItem.display_order"
)

# CommunityInput relationships
CommunityInput.community = relationship("Community", back_populates="inputs")
CommunityInput.tab = relationship("CommunityTab", back_populates="inputs")
CommunityInput.input_type = relationship("InputType", back_populates="inputs")
CommunityInput.creator = relationship("User", back_populates="community_inputs")

# Update Community, CommunityTab, InputType, and User relationships
Community.inputs = relationship(
    "CommunityInput",
    back_populates="community",
    cascade="all, delete-orphan",
    order_by="CommunityInput.created_at.desc()"
)

CommunityTab.inputs = relationship(
    "CommunityInput",
    back_populates="tab",
    cascade="all, delete-orphan",
    order_by="CommunityInput.created_at.desc()"
)

InputType.inputs = relationship(
    "CommunityInput",
    back_populates="input_type",
    cascade="all, delete-orphan",
    order_by="CommunityInput.created_at.desc()"
)

User.community_inputs = relationship(
    "CommunityInput",
    back_populates="creator",
    cascade="all, delete-orphan"
)


