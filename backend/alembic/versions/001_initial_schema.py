"""create_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-11 23:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create events table
    op.create_table(
        'events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('event_date', sa.DateTime(), nullable=False),
        sa.Column('total_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_cols', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Create seats table
    op.create_table(
        'seats',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('row_number', sa.Integer(), nullable=False),
        sa.Column('column_number', sa.Integer(), nullable=False),
        sa.Column('seat_label', sa.String(length=20), nullable=False),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'row_number', 'column_number', name='uq_event_row_col'),
        sa.UniqueConstraint('event_id', 'id', name='uq_seat_event_id')
    )
    op.create_index('ix_seats_event_id', 'seats', ['event_id'])

    # 3. Create bookings table
    op.create_table(
        'bookings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('seat_id', sa.String(length=36), nullable=False),
        sa.Column('booker_name', sa.String(length=255), nullable=False),
        sa.Column('booker_email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seat_id'], ['seats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id', 'seat_id'], ['seats.event_id', 'seats.id'], name='fk_booking_seat_event_match', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'seat_id', name='uq_booking_event_seat'),
        sa.UniqueConstraint('seat_id', name='uq_booking_seat_id')
    )
    op.create_index('ix_bookings_event_id', 'bookings', ['event_id'])
    op.create_index('ix_bookings_seat_id', 'bookings', ['seat_id'])


def downgrade() -> None:
    op.drop_table('bookings')
    op.drop_table('seats')
    op.drop_table('events')
