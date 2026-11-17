// "Complete your profile" priorities and the Learn modules each one unlocks.
// Content is general education, not advice — the Learn page says so.

export const PRIORITIES = [
  { id: "pay_off_debt", label: "Pay off debt", emoji: "💳" },
  { id: "retirement", label: "Save for retirement", emoji: "🏝️" },
  { id: "track_spending", label: "Know where my money is going", emoji: "🔍" },
  { id: "budget", label: "Spend less / stick to a budget", emoji: "✂️" },
  { id: "emergency_fund", label: "Build an emergency fund", emoji: "🛟" },
  { id: "invest", label: "Start investing", emoji: "📈" },
  { id: "big_purchase", label: "Save for something big (home, car, wedding)", emoji: "🏡" },
  { id: "partner", label: "Manage money with a partner", emoji: "🤝" },
] as const;

export type PriorityId = (typeof PRIORITIES)[number]["id"];

export const PRIORITY_IDS: readonly string[] = PRIORITIES.map((p) => p.id);

export type LearnModule = {
  id: string;
  title: string;
  summary: string;
  priorities: PriorityId[];
  bestFor?: string;
  notFor?: string;
  sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
  action?: { label: string; href: string } | { label: string; tour: "spending" };
};

export const LEARN_MODULES: LearnModule[] = [
  // ── Debt ────────────────────────────────────────────────────────────────
  {
    id: "debt-snowball",
    title: "The debt snowball",
    summary: "Pay off your smallest balance first, then roll that payment into the next one.",
    priorities: ["pay_off_debt"],
    bestFor:
      "People with several debts who need quick wins to stay motivated, or who've tried and stalled before.",
    notFor:
      "Someone with one huge high-interest balance and a lot of small low-interest ones — the interest you pay while clearing the small ones can add up.",
    sections: [
      {
        heading: "How it works",
        bullets: [
          "List every debt from smallest balance to largest, ignoring interest rates.",
          "Pay the minimum on everything.",
          "Throw every extra dollar at the smallest balance until it's gone.",
          "Add the payment you were making on it to the next-smallest debt. The payment snowballs as each debt disappears.",
        ],
      },
      {
        heading: "Why it works",
        paragraphs: [
          "It isn't mathematically optimal. What it does is behavioral: you close out whole accounts early, and seeing debts disappear keeps people going. Research on household debt repayment (e.g. Kellogg School of Management studies) found people who focused on closing out individual balances were more likely to finish paying off everything.",
        ],
      },
      {
        heading: "Using Candid for it",
        bullets: [
          "Add each debt as an account (type \"Other\", marked as debt on the Data Entry checklist) so it shows up in your net worth.",
          "Update balances at month end — watching each one hit $0 on the Accounts chart is the point.",
          "Use the Spending tab to find the extra dollars to throw at the smallest balance.",
        ],
      },
    ],
    action: { label: "Add your debts as accounts", href: "/accounts" },
  },
  {
    id: "debt-avalanche",
    title: "The debt avalanche",
    summary: "Pay off your highest-interest debt first. It costs the least in total interest.",
    priorities: ["pay_off_debt"],
    bestFor:
      "People who are motivated by the numbers and have at least one high-rate debt (credit cards at 20%+).",
    notFor:
      "People who need visible progress soon. If your highest-rate debt is also your biggest, it can be months before any account closes.",
    sections: [
      {
        heading: "How it works",
        bullets: [
          "List every debt from highest interest rate (APR) to lowest.",
          "Pay the minimum on everything.",
          "Put every extra dollar toward the highest-rate debt.",
          "When it's gone, roll that whole payment into the next-highest rate.",
        ],
      },
      {
        heading: "Snowball vs. avalanche",
        paragraphs: [
          "Both methods use the same total monthly payment, and both roll freed-up payments forward. The only difference is the order. Avalanche always saves you the most interest, and snowball usually feels better sooner. If your smallest debt also has the highest rate, the two methods are the same.",
          "A common hybrid: knock out one or two tiny balances for momentum, then switch to avalanche order.",
        ],
      },
      {
        heading: "Make the rates smaller, too",
        bullets: [
          "Call your card issuer and ask for a lower APR. It works more often than people expect, especially with on-time history.",
          "A 0% balance transfer card (usually a 3–5% transfer fee) can pause interest for 12–21 months, but only if you'll pay it off before the promo ends.",
          "A fixed-rate consolidation loan can replace several card rates with one lower rate. It only helps if you don't run the cards back up.",
        ],
      },
    ],
    action: { label: "Add your debts as accounts", href: "/accounts" },
  },
  {
    id: "debt-settlement",
    title: "Debt settlement: when it's right (and when it isn't)",
    summary:
      "Negotiating to pay less than you owe. It's a last resort before bankruptcy, and it has real costs.",
    priorities: ["pay_off_debt"],
    bestFor:
      "People already months behind on unsecured debt (credit cards, medical bills, personal loans) with a genuine hardship, who can't realistically repay in full and want to avoid bankruptcy.",
    notFor:
      "Anyone who is current on payments and could pay off the debt with snowball, avalanche, or a repayment plan. Settlement will badly damage your credit, and that's a lot to give up when you had other options.",
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "Creditors sometimes accept a lump sum (often 30–60% of the balance) once an account is seriously delinquent, because some money is better than none. You can negotiate this yourself, or a settlement company does it for a fee.",
        ],
      },
      {
        heading: "The costs",
        bullets: [
          "Credit damage: settlement usually means you've stopped paying for months first. Late payments and a \"settled\" status stay on your report for up to 7 years.",
          "Fees: companies typically charge 15–25% of the enrolled debt. Under the FTC's Telemarketing Sales Rule they can't charge until they've actually settled a debt. Anyone asking for money up front is a red flag.",
          "Taxes: forgiven debt over $600 is usually reported on a 1099-C and counted as income, unless you were insolvent at the time (IRS Form 982).",
          "No guarantees: creditors don't have to agree, and they can sue for the full balance while you're saving up a settlement fund.",
        ],
      },
      {
        heading: "Look at these first",
        bullets: [
          "Nonprofit credit counseling (look for NFCC members). They can set up a Debt Management Plan, which usually lowers your interest rates so you repay in full over 3–5 years, with far less credit damage.",
          "Hardship programs: many card issuers will temporarily lower rates or payments if you call and ask.",
          "Talk to a bankruptcy attorney: free consultations are common, and Chapter 7 or 13 can sometimes be the cleaner fresh start.",
        ],
      },
    ],
  },

  // ── Retirement ──────────────────────────────────────────────────────────
  {
    id: "retirement-accounts",
    title: "Retirement accounts 101",
    summary: "401(k), Roth vs. traditional, IRAs, and a common order to fund them in.",
    priorities: ["retirement", "invest"],
    sections: [
      {
        heading: "The accounts",
        bullets: [
          "401(k) / 403(b): through your employer, with high contribution limits. Many employers match part of what you put in, which is free money.",
          "Traditional (pre-tax): you get a tax break now and pay tax when you withdraw.",
          "Roth (after-tax): no tax break now, but qualified withdrawals in retirement are tax-free.",
          "IRA / Roth IRA: accounts you open yourself, with lower limits than a 401(k). Roth IRA eligibility phases out at higher incomes.",
          "HSA: if you have a high-deductible health plan, contributions are tax-deductible, growth is tax-free, and withdrawals for medical costs are tax-free too.",
        ],
      },
      {
        heading: "A common order of operations (top to bottom)",
        bullets: [
          "Contribute enough to your 401(k) to get the full employer match.",
          "Pay off high-interest debt (see the avalanche module).",
          "Build an emergency fund.",
          "Max an HSA if eligible, then a Roth or traditional IRA.",
          "Go back and increase 401(k) contributions toward the limit.",
          "Invest in a taxable brokerage account.",
        ],
      },
      {
        heading: "Roth or traditional?",
        paragraphs: [
          "Roughly: if you expect a higher tax rate in retirement than today (common early in a career), Roth wins. If your tax rate is high now and likely lower later, traditional wins. Many people split their contributions between both to hedge.",
        ],
      },
    ],
  },
  {
    id: "fire",
    title: "FIRE: Financial Independence, Retire Early",
    summary:
      "Save aggressively until your investments can cover your expenses, so work becomes optional.",
    priorities: ["retirement"],
    bestFor:
      "High savers (often 40–70% of income) who'd rather have freedom decades early than a bigger lifestyle now.",
    notFor:
      "Anyone who'd be miserable cutting spending that hard, or whose income leaves little room after essentials. One of the gentler variants below may fit better.",
    sections: [
      {
        heading: "Your FI number",
        paragraphs: [
          "Most FIRE math starts from the \"4% rule\": historically (per the Trinity study), withdrawing 4% of a diversified portfolio in year one, then adjusting for inflation, lasted at least 30 years in most periods. Flip that around and your FI number is about 25× your annual spending. Spend $40k a year, and you need about $1M.",
          "Retiring at 40 means a 50+ year retirement, longer than the study covered, so many early retirees plan on 3.25–3.5% instead (about 29–31× spending).",
        ],
      },
      {
        heading: "The flavors",
        bullets: [
          "LeanFIRE: FI on a frugal budget (often under ~$40k/yr). You get there sooner, with less cushion.",
          "Regular FIRE: FI at roughly your current lifestyle.",
          "FatFIRE: FI with a generous budget (often $100k+/yr). It takes much longer or needs a high income.",
        ],
      },
      {
        heading: "What drives it",
        paragraphs: [
          "Your savings rate matters far more than your investment returns. Going from saving 10% to 50% of income cuts the time to FI from roughly 50 years to about 17. That's why the Spending tab matters here: every recurring dollar you cut lowers your FI number and frees up more to save.",
        ],
      },
    ],
    action: { label: "Set a net worth goal for your FI number", href: "/net-worth" },
  },
  {
    id: "coast-fire",
    title: "CoastFIRE",
    summary:
      "Front-load your savings so growth alone carries you to a normal retirement, then just cover today's bills.",
    priorities: ["retirement"],
    bestFor:
      "People in their 20s–30s with a head start in savings who want to take their foot off the gas: switch to lower-paying, more meaningful work, go part-time, or stop saving and spend more now.",
    notFor:
      "People starting late. With fewer years for growth, coasting doesn't work, and the number you'd need is close to your full FI number anyway.",
    sections: [
      {
        heading: "The math",
        paragraphs: [
          "Your Coast number = FI number ÷ (1 + real return)^(years until retirement). For example, with a $1M FI number, 30 years to go, and a 5% inflation-adjusted return, you need about $231k invested today (1,000,000 ÷ 1.05³⁰). Hit that, and with zero further contributions, compounding should get you to $1M by 65.",
        ],
      },
      {
        heading: "Caveats",
        bullets: [
          "It's only as good as the return assumption. 5% real is a reasonable long-run stock assumption, not a promise.",
          "You still have to earn enough to cover all your current expenses.",
          "Many people keep saving a little after they hit Coast as a buffer.",
        ],
      },
    ],
    action: { label: "Track it with a goal", href: "/net-worth" },
  },
  {
    id: "barista-fire",
    title: "BaristaFIRE",
    summary:
      "Partially retire: your portfolio covers most expenses, and part-time work covers the rest.",
    priorities: ["retirement"],
    bestFor:
      "People who want out of full-time work soon but don't want to wait for full FI, and who'd enjoy some lighter work. It's especially common in the US, where a part-time job can provide health insurance before Medicare at 65.",
    notFor:
      "Anyone who wants to stop working completely. You're betting that part-time work stays available and that you'll still want to do it.",
    sections: [
      {
        heading: "The math",
        paragraphs: [
          "Subtract what part-time work will reliably bring in from your annual spending, then multiply the gap by 25. Spend $50k, earn $20k part-time, and you need about 25 × $30k = $750k instead of $1.25M.",
        ],
      },
      {
        heading: "Barista vs. Coast",
        paragraphs: [
          "With CoastFIRE, you work enough to cover all of your expenses, and the portfolio is left alone to grow. With BaristaFIRE, you're already withdrawing from the portfolio, and work covers only the gap. Barista needs a bigger portfolio than Coast, but lets you work less.",
        ],
      },
    ],
  },

  // ── Spending / budgeting ────────────────────────────────────────────────
  {
    id: "spending-walkthrough",
    title: "Find out where your money goes",
    summary:
      "A guided walkthrough of the Spending tab: getting statements in, filtering, the charts, and fixing categories.",
    priorities: ["track_spending", "budget"],
    sections: [
      {
        heading: "The short version",
        bullets: [
          "Download CSV statements from each bank or card and upload them on Data Entry. Re-uploading an overlapping statement is safe, because duplicates are skipped.",
          "On Spending, use Month, Category, Account, and search to narrow things down. Totals and charts update to match.",
          "Turn off categories like Rent in \"Exclude categories\" to see what you spend at your discretion.",
          "Select mis-categorized transactions in the table and move them in one click. For a permanent fix, add a keyword in Settings → Category Rules.",
          "Do this monthly. Looking at your own transactions regularly is what changes your spending.",
        ],
      },
    ],
    action: { label: "Start the spending walkthrough", tour: "spending" },
  },
  {
    id: "budget-methods",
    title: "Budgeting methods that actually stick",
    summary: "50/30/20, zero-based, and pay-yourself-first, and how to pick one.",
    priorities: ["budget", "track_spending", "emergency_fund", "big_purchase"],
    sections: [
      {
        heading: "50/30/20",
        paragraphs: [
          "Take-home pay goes 50% to needs (housing, groceries, insurance, minimum payments), 30% to wants, and 20% to savings and extra debt payments. It's simple and forgiving, and good if you've never budgeted before. In a high cost-of-living area, needs often run over 50%, so treat the numbers as a starting point.",
        ],
      },
      {
        heading: "Zero-based budgeting",
        paragraphs: [
          "Every dollar of income is assigned a job (bills, savings, fun) until income minus assignments equals $0. It's the most control and the most effort. Good for tight months or aggressive goals.",
        ],
      },
      {
        heading: "Pay yourself first",
        paragraphs: [
          "Automate savings the day your paycheck lands, then spend the rest without tracking each line. It's the least effort, and good if you're a reliable saver who hates budgeting.",
        ],
      },
      {
        heading: "Picking one",
        paragraphs: [
          "Start by looking: a month or two on the Spending tab shows your real numbers. Then pick the lightest method that fixes whatever surprised you. Check Net Cash Flow each month. If it's positive, the method is working.",
        ],
      },
    ],
    action: { label: "Start the spending walkthrough", tour: "spending" },
  },

  // ── Safety net / saving / investing ─────────────────────────────────────
  {
    id: "emergency-fund",
    title: "Building an emergency fund",
    summary: "How much to keep, where to keep it, and how to build it without stalling everything else.",
    priorities: ["emergency_fund", "pay_off_debt"],
    sections: [
      {
        heading: "How much",
        bullets: [
          "Starter: $1,000–$2,000, enough that a car repair doesn't go on a credit card. Build this even while paying off debt.",
          "Full: 3–6 months of essential expenses. Lean toward 6+ if your income is variable, you're the only earner, or you work in a volatile field.",
          "Your Spending tab gives the real monthly number: exclude the non-essential categories and look at what's left.",
        ],
      },
      {
        heading: "Where",
        paragraphs: [
          "A high-yield savings account at a separate bank from your checking: easy to reach in a real emergency, but not so easy you dip into it for takeout. Not invested in stocks, because the point is that it's there when markets are down too.",
        ],
      },
    ],
    action: { label: "Create an emergency fund goal", href: "/net-worth" },
  },
  {
    id: "investing-basics",
    title: "Investing basics: index funds",
    summary: "Why low-cost, broad index funds are the default starting point for most people.",
    priorities: ["invest", "retirement"],
    sections: [
      {
        heading: "The core idea",
        paragraphs: [
          "A broad index fund (a total US market fund, an S&P 500 fund, or a global fund) owns a small piece of thousands of companies. You get the market's return minus a tiny fee, instead of betting on picking winners. Over long periods, most actively managed funds trail their index after fees.",
        ],
      },
      {
        heading: "What matters",
        bullets: [
          "Fees: look at the expense ratio. 0.03–0.20% is typical for index funds. A 1% fee can eat a quarter or more of your returns over a few decades.",
          "Time in the market: money you may need within ~5 years generally doesn't belong in stocks.",
          "Consistency: automatic monthly contributions (dollar-cost averaging) take timing and emotion out of it.",
          "Simplicity: a target-date fund is one fund that adjusts its mix for you as retirement gets closer.",
        ],
      },
      {
        heading: "Before you invest",
        paragraphs: [
          "Get any employer match first, clear high-interest debt, and have at least a starter emergency fund. See Retirement accounts 101 for the full order.",
        ],
      },
    ],
  },
  {
    id: "sinking-funds",
    title: "Saving for something big",
    summary: "Turn a big purchase into a monthly number with a sinking fund, and track it as a goal.",
    priorities: ["big_purchase"],
    sections: [
      {
        heading: "Sinking funds",
        paragraphs: [
          "Divide the target by the months you have left: a $30k down payment in 24 months is $1,250/month. Move that amount to a dedicated savings account automatically. Keep money you'll need within a few years in high-yield savings or CDs, not stocks.",
        ],
      },
      {
        heading: "Rules of thumb",
        bullets: [
          "Home: a 20% down payment avoids PMI on a conventional loan. Also budget 2–5% for closing costs and 1%/yr for maintenance.",
          "Car: the 20/4/10 guideline is 20% down, a loan of 4 years or less, and total car costs under 10% of gross income.",
          "Wedding or trip: decide the number before you start booking anything.",
        ],
      },
      {
        heading: "Using Candid for it",
        paragraphs: [
          "Create a Goal on the Net Worth tab scoped to that savings account, with a target date and monthly contribution. It shows whether you're ahead or behind and projects when you'll hit it.",
        ],
      },
    ],
    action: { label: "Create a goal", href: "/net-worth" },
  },
  {
    id: "money-with-partner",
    title: "Managing money with a partner",
    summary: "Joint, separate, or hybrid finances, and how Candid's Combined view works.",
    priorities: ["partner"],
    sections: [
      {
        heading: "Three common setups",
        bullets: [
          "Fully joint: everything pooled. Simple, but it needs a lot of trust and agreement on spending.",
          "Fully separate: each pays an agreed share of shared costs. Gives the most independence.",
          "Hybrid (most common): a joint account for shared bills, funded proportionally to income, plus personal accounts for each of you.",
        ],
      },
      {
        heading: "Have the conversation",
        paragraphs: [
          "Share your debts, incomes, and goals openly, and agree on a dollar amount above which either of you checks with the other before buying. A short monthly money date where you look at the numbers together prevents most fights.",
        ],
      },
      {
        heading: "Candid's Combined view",
        paragraphs: [
          "Invite your partner from Settings. Once they accept, you both get a Combined tab with combined net worth, cash flow, and category-level spending. Neither of you ever sees the other's individual transactions, and either of you can unlink at any time.",
        ],
      },
    ],
    action: { label: "Invite your partner", href: "/settings" },
  },
];

export function recommendedModules(priorities: readonly string[]): LearnModule[] {
  return LEARN_MODULES.filter((m) => m.priorities.some((p) => priorities.includes(p)));
}
