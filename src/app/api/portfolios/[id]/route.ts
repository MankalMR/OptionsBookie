import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { portfolioDb } from '@/lib/database-portfolios';
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolio = await portfolioDb.getPortfolio(id, session.user.email);
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    logger.error({ error }, 'Error fetching portfolio:');
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isDefault } = body;

    const portfolio = await portfolioDb.updatePortfolio(
      id,
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
    logger.error({ error }, 'Error updating portfolio:');
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    logger.info({ id }, 'PATCH /api/portfolios/[id] - Portfolio ID:');

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      logger.info('PATCH /api/portfolios/[id] - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info({ data0: session.user.email }, 'PATCH /api/portfolios/[id] - User email:');

    const body = await request.json();
    const { action } = body;
    logger.info({ action }, 'PATCH /api/portfolios/[id] - Action:');

    if (action === 'setDefault') {
      logger.info('PATCH /api/portfolios/[id] - Setting default portfolio');
      const portfolio = await portfolioDb.setDefaultPortfolio(id, session.user.email);
      logger.info({ portfolio }, 'PATCH /api/portfolios/[id] - Result:');

      if (!portfolio) {
        logger.info('PATCH /api/portfolios/[id] - Portfolio not found');
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      return NextResponse.json(portfolio);
    }

    logger.info('PATCH /api/portfolios/[id] - Invalid action');
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error({ error }, 'Error updating portfolio:');
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await portfolioDb.deletePortfolio(id, session.user.email);
    if (!success) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting portfolio:');
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
