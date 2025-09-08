import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { OptionsTransaction } from '@/types/options';

// GET /api/transactions/[id] - Get a specific transaction
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = dbOperations.getTransaction(params.id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = body as Partial<OptionsTransaction>;

    const updatedTransaction = dbOperations.updateTransaction(params.id, updates);

    if (!updatedTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedTransaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = dbOperations.deleteTransaction(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
