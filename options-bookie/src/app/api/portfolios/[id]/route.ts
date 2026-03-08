import { NextRequest, NextResponse } from 'next/server';
import { debugLog } from '@/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { portfolioDb } from '@/lib/database-portfolios';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolio = await portfolioDb.getPortfolio(params.id, session.user.email);
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isDefault } = body;

    const portfolio = await portfolioDb.updatePortfolio(
      params.id,
      {
        name,
        description,
        isDefault,
      },
      session.user.email
    );

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    debugLog('PATCH /api/portfolios/[id] - Portfolio ID:', params.id);

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      debugLog('PATCH /api/portfolios/[id] - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    debugLog('PATCH /api/portfolios/[id] - User email:', session.user.email);

    const body = await request.json();
    const { action } = body;
    debugLog('PATCH /api/portfolios/[id] - Action:', action);

    if (action === 'setDefault') {
      debugLog('PATCH /api/portfolios/[id] - Setting default portfolio');
      const portfolio = await portfolioDb.setDefaultPortfolio(params.id, session.user.email);
      debugLog('PATCH /api/portfolios/[id] - Result:', portfolio);

      if (!portfolio) {
        debugLog('PATCH /api/portfolios/[id] - Portfolio not found');
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      return NextResponse.json(portfolio);
    }

    debugLog('PATCH /api/portfolios/[id] - Invalid action');
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await portfolioDb.deletePortfolio(params.id, session.user.email);
    if (!success) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
