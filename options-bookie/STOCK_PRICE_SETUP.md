# 📈 Stock Price API Setup Guide

This guide covers the proper implementation of stock price APIs for your OptionsBookie app, with real options and pricing analysis.

## 🚨 **Important: Previous Implementation Error**

The initial implementation incorrectly used Perplexity API, which **does not provide stock price data**. Perplexity is designed for language processing, not financial data.

## 🎯 **Recommended APIs for Small Projects**

### **1. Yahoo Finance (Unofficial)** ⭐⭐⭐⭐⭐ (Best Choice)
**Best for: Free, simple projects, immediate setup**

#### **Pricing:**
- **Free**: Unlimited (unofficial)
- **No API key required**

#### **Features:**
- Real-time stock prices
- Historical data
- No rate limits
- No delays
- **Batch requests** (multiple symbols in one call)

#### **Setup:**
- No setup required - works out of the box
- Automatically used as fallback

#### **Pros:**
- ✅ Completely free
- ✅ No rate limits
- ✅ No API key needed
- ✅ Real-time data
- ✅ **Batch requests** (1 call = multiple symbols)

#### **Cons:**
- ❌ Unofficial (can break anytime)
- ❌ No support
- ❌ Terms of service issues

---

### **2. Financial Modeling Prep (FMP)** ⭐⭐⭐⭐ (Professional Choice)
**Best for: Professional projects, reliable data**

#### **Pricing:**
- **Free Tier**: 250 requests/day
- **Paid Plans**: $14/month for 10,000 requests/day
- **No credit card required** for free tier

#### **Features:**
- Real-time stock prices
- Historical data
- Financial statements
- **Batch requests** (multiple symbols in one call)
- Professional support

#### **Setup:**
1. Go to [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs)
2. Sign up for free account
3. Get your API key
4. Add to environment variables:
   ```env
   FMP_API_KEY=your_api_key_here
   ```

#### **Pros:**
- ✅ **Batch requests** (1 call = multiple symbols)
- ✅ 250 requests/day (10x more than Alpha Vantage)
- ✅ Reliable data
- ✅ Professional support
- ✅ Good documentation

#### **Cons:**
- ❌ API key required
- ❌ Rate limits on free tier

---

### **3. Alpha Vantage** ⭐⭐⭐ (Limited)
**Best for: Very small portfolios only**

#### **Pricing:**
- **Free Tier**: 25 requests/day, 5 requests/minute
- **Paid Plans**: $49.99/month for 1200 requests/day
- **No credit card required** for free tier

#### **Features:**
- Real-time stock prices
- Historical data
- Technical indicators
- 1-minute delay on free tier
- **Sequential requests** (1 call = 1 symbol)

#### **Setup:**
1. Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Sign up for free account
3. Get your API key
4. Add to environment variables:
   ```env
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

#### **Pros:**
- ✅ Reliable data
- ✅ Good documentation
- ✅ No credit card required

#### **Cons:**
- ❌ **Sequential requests** (1 call = 1 symbol)
- ❌ Very limited free tier (25 requests/day)
- ❌ 1-minute delay on free tier
- ❌ Not suitable for portfolios with many stocks

---

### **4. IEX Cloud** ❌ (SHUT DOWN)
**Status: Ceased operations August 31, 2024**

#### **Pricing:**
- **Free**: Unlimited (unofficial)
- **No API key required**

#### **Features:**
- Real-time stock prices
- Historical data
- No rate limits
- No delays

#### **Setup:**
- No setup required - works out of the box
- Automatically used as fallback

#### **Pros:**
- ✅ Completely free
- ✅ No rate limits
- ✅ No API key needed
- ✅ Real-time data

#### **Cons:**
- ❌ Unofficial (can break anytime)
- ❌ No support
- ❌ Terms of service issues
- ❌ High maintenance risk

---

### **3. IEX Cloud** ⭐⭐⭐⭐
**Best for: Professional projects, real-time needs**

#### **Pricing:**
- **Free Tier**: 50,000 core data credits/month
- **Paid Plans**: $9/month for 500K credits
- **Credit-based system**

#### **Features:**
- Real-time stock prices
- Historical data
- Professional grade
- No delays

#### **Setup:**
1. Go to [IEX Cloud](https://iexcloud.io/pricing/)
2. Sign up for free account
3. Get your API key
4. Add to environment variables:
   ```env
   IEX_CLOUD_API_KEY=your_api_key_here
   ```

#### **Pros:**
- ✅ High-quality data
- ✅ Real-time (no delay)
- ✅ Good free tier
- ✅ Professional grade

#### **Cons:**
- ❌ More complex pricing
- ❌ Credit-based system
- ❌ Overkill for small projects

---

## 🔧 **Implementation Strategy**

### **Current Implementation:**
The app now uses a **factory pattern** that automatically selects the best available provider:

1. **Alpha Vantage** (if API key is configured)
2. **Yahoo Finance** (fallback, no API key needed)
3. **None** (if no providers are available)

### **How It Works:**
```typescript
// Automatically selects the best available provider
const availableProviders = StockPriceFactory.getAvailableProviders();
const provider = availableProviders.includes('alpha-vantage') ? 'alpha-vantage' :
                availableProviders.includes('yahoo-finance') ? 'yahoo-finance' : 'none';
```

## 🚀 **Quick Start (No API Key Required)**

The app works immediately with Yahoo Finance (unofficial) - no setup needed!

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Add a trade** with stock symbol (e.g., "AAPL")

3. **See live prices** in the "Current Price" column

## 🔑 **Enhanced Setup (Alpha Vantage)**

For more reliable data and higher rate limits:

1. **Get Alpha Vantage API key:**
   - Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Sign up (free)
   - Get your API key

2. **Add to environment variables:**
   ```env
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

3. **Redeploy** (if using Vercel)

## 📊 **Rate Limits & Usage**

### **Alpha Vantage (Free Tier):**
- **25 requests/day**
- **5 requests/minute**
- **1-minute delay** on data

### **Yahoo Finance (Unofficial):**
- **No rate limits**
- **Real-time data**
- **Unreliable** (can break)

### **Usage Optimization:**
- **Auto-refresh**: Every 5 minutes
- **Manual refresh**: Available
- **Batch requests**: Multiple symbols at once
- **Caching**: Reduces API calls

## 🎯 **Features Included**

### **Current Price Column:**
- Live stock prices
- Price change indicators (up/down arrows)
- Percentage changes
- Last updated timestamp

### **ITM/OTM/ATM Indicators:**
- **ITM (In The Money)**: Green - Current price > Strike price
- **OTM (Out Of The Money)**: Red - Current price < Strike price
- **ATM (At The Money)**: Yellow - Current price ≈ Strike price

### **Price Comparison:**
- Difference between current price and strike price
- Percentage difference
- Color-coded indicators

## 🔄 **Switching Providers**

The factory pattern makes it easy to switch providers:

```typescript
// Force a specific provider
const stockService = StockPriceFactory.initialize('alpha-vantage');
// or
const stockService = StockPriceFactory.initialize('yahoo-finance');
```

## 🚨 **Troubleshooting**

### **Issue: "Price unavailable"**
- **Check API key** (if using Alpha Vantage)
- **Check network connection**
- **Look at browser console** for errors
- **Try manual refresh**

### **Issue: Rate limit exceeded**
- **Wait** for rate limit to reset
- **Switch to Yahoo Finance** (no limits)
- **Upgrade** to paid Alpha Vantage plan

### **Issue: Wrong prices**
- **Check stock symbol** format (uppercase, no spaces)
- **Verify symbol exists** on stock market
- **Try different provider**

## 💰 **Cost Analysis**

### **For Small Projects (1-10 users):**
- **Alpha Vantage Free**: $0/month (25 requests/day)
- **Yahoo Finance**: $0/month (unlimited, unofficial)
- **IEX Cloud Free**: $0/month (50K credits/month)

### **For Medium Projects (10-100 users):**
- **Alpha Vantage Paid**: $49.99/month
- **IEX Cloud Paid**: $9/month
- **Yahoo Finance**: $0/month (risky)

## 🎉 **Success!**

Your OptionsBookie app now has:
- ✅ **Real-time stock prices** (via Yahoo Finance)
- ✅ **Reliable data** (via Alpha Vantage, if configured)
- ✅ **Price comparisons** with strike prices
- ✅ **ITM/OTM/ATM indicators**
- ✅ **Auto-refresh** functionality
- ✅ **Manual refresh** capability
- ✅ **Multiple provider support**

The app works immediately without any setup, and you can enhance it with Alpha Vantage for more reliable data! 🚀
