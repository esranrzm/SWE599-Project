"""
Migration script to create table for community inputs.
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
    """Create table for community inputs if it doesn't exist."""
    db = SessionLocal()
    try:
        # Check if table already exists
        if table_exists(db, 'community_inputs'):
            print("Table 'community_inputs' already exists. Migration not needed.")
            return
        
        print("Creating database table for community inputs...")
        
        # Create community_inputs table
        create_inputs_table = text("""
            CREATE TABLE community_inputs (
                id SERIAL PRIMARY KEY,
                community_id INTEGER NOT NULL,
                tab_id INTEGER NOT NULL,
                input_type_id INTEGER NOT NULL,
                creator_id INTEGER NOT NULL,
                details TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT fk_community_inputs_community 
                    FOREIGN KEY (community_id) 
                    REFERENCES communities(id) 
                    ON DELETE CASCADE,
                CONSTRAINT fk_community_inputs_tab 
                    FOREIGN KEY (tab_id) 
                    REFERENCES community_tabs(id) 
                    ON DELETE CASCADE,
                CONSTRAINT fk_community_inputs_input_type 
                    FOREIGN KEY (input_type_id) 
                    REFERENCES input_types(id) 
                    ON DELETE CASCADE,
                CONSTRAINT fk_community_inputs_creator 
                    FOREIGN KEY (creator_id) 
                    REFERENCES users(id)
            )
        """)
        db.execute(create_inputs_table)
        print("✓ Created 'community_inputs' table")
        
        # Create indexes
        create_community_index = text("""
            CREATE INDEX idx_community_inputs_community_id ON community_inputs(community_id)
        """)
        db.execute(create_community_index)
        
        create_tab_index = text("""
            CREATE INDEX idx_community_inputs_tab_id ON community_inputs(tab_id)
        """)
        db.execute(create_tab_index)
        
        create_input_type_index = text("""
            CREATE INDEX idx_community_inputs_input_type_id ON community_inputs(input_type_id)
        """)
        db.execute(create_input_type_index)
        
        create_creator_index = text("""
            CREATE INDEX idx_community_inputs_creator_id ON community_inputs(creator_id)
        """)
        db.execute(create_creator_index)
        
        # Create composite index for efficient querying by community and tab
        create_composite_index = text("""
            CREATE INDEX idx_community_inputs_community_tab ON community_inputs(community_id, tab_id)
        """)
        db.execute(create_composite_index)
        
        db.commit()
        print("✓ Successfully created table and indexes!")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running migration to create community_inputs table...")
    migrate()
    print("Migration completed!")

