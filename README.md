# Contact Metrics Dashboard

Upload Amazon Connect contact search results and phone number data to compute agent connect time, handle time, and after-call work (ACW) metrics. Filter by routing profile, initiation method, or phone description. Export for Excel or presentations.

## How to get the data

### 1. Contact Search CSV

Go to **Amazon Connect Console → Analytics and Optimization → Contact Search**.

- Set your desired date range and search criteria
- Click **Export** → **Download CSV**
- Save the file (columns include contact ID, timestamps, routing profile, agent, etc.)

### 2. Phone Numbers CSV

Go to **Amazon Connect Console → Phone Numbers**.

- View your claimed phone numbers
- Export the list as CSV (columns: phone number, description, type, country, etc.)

> Both CSVs are joined on the phone number (digits only) to enrich contact records with phone description, type, country, and contact flow.

## Usage

1. **Load Data** — click the "Load Data" button in the top-right corner
2. **Step 1** — upload your Phone Numbers CSV
3. **Step 2** — upload your Contact Search Results CSV
4. The dashboard computes metrics automatically:

| Metric | Description |
|--------|-------------|
| Agent Connect Time | `connectedToAgentTimestamp - initiationTimestamp` |
| Handle Time | `agentInteractionDuration` |
| After ACW Time | `acwEndTimestamp - acwStartTimestamp` |

### Filtering

Use the filter bar to narrow results by:
- **Routing Profile** — compare performance across routing profiles
- **Initiation Method** — inbound vs outbound vs callback
- **Phone Description** — specific phone number descriptions

When filters are active, metric cards show the filtered averages and an executive summary compares filtered vs overall performance.

### Export

- **Download CSV** — filtered records as a CSV file
- **Copy Table** — tab-separated values ready for Excel
- **Copy Summary** — formatted text summary for emails or slide decks

Individual metric values can also be copied by hovering over a card and clicking the copy icon.

## Tech

React + TypeScript + Vite + Mantine v7 + framer-motion + PapaParse.
