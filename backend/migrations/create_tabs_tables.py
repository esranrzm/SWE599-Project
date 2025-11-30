"""
Migration script to create tables for community tabs, input types, and input type items.
Run this script once to update your database schema.
"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, inspect
from app.database import engine, SessionLocal

def table_exists(db, table_name):
    """Check if a table exists in the database."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def migrate():
    """Create tables for tabs, input types, and items if they don't exist."""
    db = SessionLocal()
    try:
        # Check if tables already exist
        if table_exists(db, 'community_tabs'):
            print("Table 'community_tabs' already exists. Migration not needed.")
            return
        
        print("Creating database tables for tabs, input types, and items...")
        
        # Create community_tabs table
        create_tabs_table = text("""
            CREATE TABLE community_tabs (
                id SERIAL PRIMARY KEY,
                community_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                color VARCHAR(7) NOT NULL,
                description TEXT,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT fk_community_tabs_community 
                    FOREIGN KEY (community_id) 
                    REFERENCES communities(id) 
                    ON DELETE CASCADE
            )
        """)
        db.execute(create_tabs_table)
        print("✓ Created 'community_tabs' table")
        
        # Create index on community_id
        create_tabs_index = text("""
            CREATE INDEX idx_community_tabs_community_id ON community_tabs(community_id)
        """)
        db.execute(create_tabs_index)
        
        # Create composite index for ordered retrieval
        create_tabs_order_index = text("""
            CREATE INDEX idx_community_tabs_community_order ON community_tabs(community_id, display_order)
        """)
        db.execute(create_tabs_order_index)
        
        # Create input_types table
        create_input_types_table = text("""
            CREATE TABLE input_types (
                id SERIAL PRIMARY KEY,
                tab_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                name VARCHAR(200) NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT fk_input_types_tab 
                    FOREIGN KEY (tab_id) 
                    REFERENCES community_tabs(id) 
                    ON DELETE CASCADE
            )
        """)
        db.execute(create_input_types_table)
        print("✓ Created 'input_types' table")
        
        # Create index on tab_id
        create_input_types_index = text("""
            CREATE INDEX idx_input_types_tab_id ON input_types(tab_id)
        """)
        db.execute(create_input_types_index)
        
        # Create composite index for ordered retrieval
        create_input_types_order_index = text("""
            CREATE INDEX idx_input_types_tab_order ON input_types(tab_id, display_order)
        """)
        db.execute(create_input_types_order_index)
        
        # Create input_type_items table
        create_items_table = text("""
            CREATE TABLE input_type_items (
                id SERIAL PRIMARY KEY,
                input_type_id INTEGER NOT NULL,
                value VARCHAR(500) NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                CONSTRAINT fk_input_type_items_input_type 
                    FOREIGN KEY (input_type_id) 
                    REFERENCES input_types(id) 
                    ON DELETE CASCADE
            )
        """)
        db.execute(create_items_table)
        print("✓ Created 'input_type_items' table")
        
        # Create index on input_type_id
        create_items_index = text("""
            CREATE INDEX idx_input_type_items_input_type_id ON input_type_items(input_type_id)
        """)
        db.execute(create_items_index)
        
        # Create composite index for ordered retrieval
        create_items_order_index = text("""
            CREATE INDEX idx_input_type_items_input_type_order ON input_type_items(input_type_id, display_order)
        """)
        db.execute(create_items_order_index)
        
        db.commit()
        print("✓ Successfully created all tables and indexes!")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running migration to create tabs, input types, and items tables...")
    migrate()
    print("Migration completed!")

