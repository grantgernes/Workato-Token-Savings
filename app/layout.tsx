import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Token Lab",
  description: "Observe token costs across MCP server configurations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DemoDisclaimer />
        {children}
      </body>
    </html>
  );
}

function DemoDisclaimer() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-[11px] px-4 py-1.5 text-center">
      <span className="font-semibold">Presentation mock</span> — the &quot;Salesforce,&quot; &quot;NetSuite,&quot; &quot;Snowflake,&quot; &quot;HubSpot,&quot;
      &quot;Zendesk,&quot; &quot;Jira,&quot; &quot;Slack,&quot; and &quot;Google Drive&quot; MCP servers here are local stubs with
      synthetic data used only to compare token usage. Not affiliated with, endorsed by, or copied
      from any listed vendor.
    </div>
  );
}
