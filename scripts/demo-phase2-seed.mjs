const apiOrigin = process.env.CANTON_DARK_API_ORIGIN ?? "http://127.0.0.1:4301";
const operatorOrigin = process.env.CANTON_DARK_OPERATOR_ORIGIN ?? "http://127.0.0.1:4173";
const subscriberOrigin = process.env.CANTON_DARK_SUBSCRIBER_ORIGIN ?? "http://127.0.0.1:4174";
const dealerOrigin = process.env.CANTON_DARK_DEALER_ORIGIN ?? "http://127.0.0.1:4175";
const demoOrigin = process.env.CANTON_DARK_DEMO_ORIGIN ?? "http://127.0.0.1:4172";
const mode = process.argv[2] ?? "phase2-ready";

const response = await fetch(`${apiOrigin}/demo/reset`, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    mode
  })
});

if (!response.ok) {
  console.error(`Failed to seed Phase 2 demo state from ${apiOrigin}.`);
  console.error(await response.text());
  process.exit(1);
}

const status = await response.json();
const query = (actorId) =>
  `?actorId=${encodeURIComponent(actorId)}&pairId=${encodeURIComponent(status.pairId)}`;

console.log("Phase 2 demo state ready");
console.log(`Mode: ${status.mode}`);
console.log(`Pair: ${status.pairId}`);
console.log(`API clock: ${status.currentTime}`);
console.log(`Demo orchestrator: ${demoOrigin}`);
console.log(`Operator: ${operatorOrigin}/${query(status.operatorId)}`);
console.log(`Subscriber: ${subscriberOrigin}/${query(status.subscriberId)}`);

for (const dealerId of status.dealerIds) {
  console.log(`Dealer ${dealerId}: ${dealerOrigin}/${query(dealerId)}`);
}
