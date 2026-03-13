import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    // Build query
    let query = supabase
      .from('trade_chains')
      .select('*, transactions:options_transactions(*)')
      .eq('user_id', session.user.email)
      .order('created_at', { ascending: false });

    if (portfolioId && portfolioId !== 'all') {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trade chains:', error);
      return NextResponse.json({ error: 'Failed to fetch trade chains' }, { status: 500 });
    }

    // Map database fields to frontend format
    const mappedData = (data || []).map((chain: any) => ({
      id: chain.id,
      userId: chain.user_id,
      portfolioId: chain.portfolio_id,
      symbol: chain.symbol,
      optionType: chain.option_type,
      originalStrikePrice: chain.original_strike_price,
      originalOpenDate: chain.original_open_date,
      chainStatus: chain.chain_status,
      totalChainPnl: chain.total_chain_pnl,
      createdAt: chain.created_at,
      updatedAt: chain.updated_at,
      transactions: chain.transactions
    }));

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Error in trade chains GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      portfolioId,
      symbol,
      optionType,
      originalStrikePrice,
      originalOpenDate,
      chainStatus = 'Active',
      totalChainPnl = 0
    } = body;

    // Create new trade chain
    const { data, error } = await supabase
      .from('trade_chains')
      .insert([{
        user_id: session.user.email,
        portfolio_id: portfolioId,
        symbol: symbol.toUpperCase(),
        option_type: optionType,
        original_strike_price: originalStrikePrice,
        original_open_date: originalOpenDate,
        chain_status: chainStatus,
        total_chain_pnl: totalChainPnl
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating trade chain:', error);
      return NextResponse.json({ error: 'Failed to create trade chain' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in trade chains POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

