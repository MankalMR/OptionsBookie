import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { portfolioDb } from '@/lib/database-portfolios';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolios = await portfolioDb.getPortfolios(session.user.email);
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }

    const portfolio = await portfolioDb.createPortfolio(
      {
        userId: session.user.email,
        name,
        description,
        isDefault: isDefault || false,
      },
      session.user.email
    );

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}
