const http = require('http');

const projectId = "69b511e2706715a6f14b69d6";
const freelancerId = "69b512fd706715a6f14b69f7";

const testPayload = {
  milestoneTitle: "Testing & Deployment",
  freelancerId: freelancerId,
  freelancerName: "Test Freelancer",
  completionPercentage: 100,
  releasedAmount: 10000
};

const postData = JSON.stringify(testPayload);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/projects/${projectId}/milestones/progress`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log("\n🚀 Auto-Payment Test Shuru...\n");

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const autopayout = result.autopayoutDetails;

      console.log("✅ Response Mila:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      if (autopayout) {
        console.log("\n🎉 AUTO-PAYMENT TRIGGERED!");
        console.log(`   Status: ${autopayout.status}`);
        console.log(`   Transaction ID: ${autopayout.transactionId}`);
        console.log(`   Amount: ₹${testPayload.releasedAmount}`);
        console.log(`   Message: ${autopayout.message}\n`);
      } else {
        console.log("\n❌ AUTO-PAYMENT FAILED\n");
      }

      if (result.project && result.project.paymentHistory) {
        const latest = result.project.paymentHistory[result.project.paymentHistory.length - 1];
        console.log("💾 Database Save:");
        console.log(`   Auto-Triggered: ${latest.autoPayoutTriggered}`);
        console.log(`   Status: ${latest.paymentStatus}`);
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      if (autopayout && autopayout.status === "processing") {
        console.log("✨ SUCCESS! Payout Processing...");
      }

    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(postData);
req.end();
