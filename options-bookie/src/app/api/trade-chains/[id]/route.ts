import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('trade_chains')
      .select('*, transactions:options_transactions(*)')
      .eq('id', params.id)
      .eq('user_id', session.user.email)
      .single();

    if (error) {
      console.error('Error fetching trade chain:', error);
      return NextResponse.json({ error: 'Trade chain not found' }, { status: 404 });
    }

    // Map database fields to frontend format
    const mappedData = {
      id: data.id,
      userId: data.user_id,
      portfolioId: data.portfolio_id,
      symbol: data.symbol,
      optionType: data.option_type,
      originalStrikePrice: data.original_strike_price,
      originalOpenDate: data.original_open_date,
      chainStatus: data.chain_status,
      totalChainPnl: data.total_chain_pnl,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      transactions: data.transactions
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Error in trade chain GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const updates = { ...body };

    // Convert camelCase to snake_case for database
    if (updates.chainStatus) {
      updates.chain_status = updates.chainStatus;
      delete updates.chainStatus;
    }
    if (updates.totalChainPnl !== undefined) {
      updates.total_chain_pnl = updates.totalChainPnl;
      delete updates.totalChainPnl;
    }

    const { data, error } = await supabase
      .from('trade_chains')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', session.user.email)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade chain:', error);
      return NextResponse.json({ error: 'Failed to update trade chain' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in trade chain PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

