const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'default_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'default_key_secret'
});

/**
 * Create a Razorpay order for employer budget deposit.
 * @param {number} amount - Amount in INR
 * @returns {Promise<Object>} Razorpay order response
 */
const createOrder = async (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  return razorpay.orders.create({
    amount: Math.round(numericAmount * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`
  });
};

/**
 * Process automatic payout to freelancer when milestone is 100% verified
 * @param {Object} paymentDetails - Payment details
 * @param {string} paymentDetails.freelancerId - Freelancer user ID
 * @param {string} paymentDetails.freelancerName - Freelancer name
 * @param {string} paymentDetails.freelancerUPI - Freelancer UPI ID
 * @param {number} paymentDetails.amount - Amount to pay in paise (convert from rupees)
 * @param {string} paymentDetails.milestoneTitle - Milestone title
 * @param {string} paymentDetails.projectId - Project ID
 * @Returns {Promise<Object>} Payment transaction details
 */
const processAutomaticPayout = async (paymentDetails) => {
  try {
    const {
      freelancerId,
      freelancerName,
      freelancerUPI,
      amount,
      milestoneTitle,
      projectId
    } = paymentDetails;

    if (!freelancerId || !amount || amount <= 0) {
      throw new Error('Invalid freelancer ID or amount');
    }

    if (!freelancerUPI || !freelancerUPI.trim()) {
      // If UPI not available, return pending payment record
      return {
        success: false,
        status: 'pending',
        reason: 'Freelancer UPI ID not provided',
        canRetry: true,
        details: {
          freelancerId,
          freelancerName,
          amount,
          milestoneTitle,
          projectId,
          initiatedAtTimestamp: Date.now()
        }
      };
    }

    // Create payout using Razorpay Payout API
    // Amount is in paise (100 = ₹1)
    const amountInPaise = Math.round(amount * 100);

    const payoutPayload = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || 'default_account',
      fund_account_id: await getOrCreateFundAccount(freelancerUPI, freelancerName),
      amount: amountInPaise,
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: `${projectId}-${milestoneTitle}-${Date.now()}`,
      narration: `Milestone: ${milestoneTitle}`,
      notes: {
        projectId,
        milestoneTitle,
        freelancerId,
        freelancerName
      }
    };

    // For now, we'll simulate the payout success
    // In production, uncomment the actual Razorpay call:
    // const payout = await razorpay.payouts.create(payoutPayload);

    // Simulated successful payout
    const transactionId = `PAYOUT-${projectId}-${milestoneTitle}-${Date.now()}`;

    return {
      success: true,
      status: 'processing',
      transactionId,
      freelancerId,
      freelancerName,
      freelancerUPI: maskUPI(freelancerUPI),
      amount,
      milestoneTitle,
      projectId,
      processedAtTimestamp: Date.now(),
      expectedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      message: `Automatic payout of ₹${amount} initiated for ${milestoneTitle}`
    };
  } catch (error) {
    console.error('Automatic payout error:', error);
    return {
      success: false,
      status: 'failed',
      error: error.message,
      canRetry: true,
      details: paymentDetails,
      failedAtTimestamp: Date.now()
    };
  }
};

/**
 * Get or create a fund account for the given UPI
 * @param {string} upiId - UPI identifier
 * @param {string} name - Name of the person
 * @returns {Promise<string>} Fund account ID
 */
const getOrCreateFundAccount = async (upiId, name) => {
  try {
    // In a real implementation, we would:
    // 1. Check if fund account already exists for this UPI
    // 2. Create one if it doesn't exist
    // For now, returning a mock fund account ID

    const fundAccountPayload = {
      account_type: 'upi',
      upi: {
        address: upiId
      },
      contact_id: await getOrCreateContact(name, upiId)
    };

    // Actual implementation:
    // const fundAccount = await razorpay.fundAccount.create(fundAccountPayload);
    // return fundAccount.id;

    // Mock response
    return `fa_${Date.now()}_${upiId.split('@')[0]}`;
  } catch (error) {
    console.error('Error creating fund account:', error);
    throw error;
  }
};

/**
 * Get or create a contact for the given UPI
 * @param {string} name - Contact name
 * @param {string} upiId - UPI identifier
 * @returns {Promise<string>} Contact ID
 */
const getOrCreateContact = async (name, upiId) => {
  try {
    // In a real implementation:
    // const contact = await razorpay.contacts.create({
    //   name,
    //   email: `${upiId.split('@')[0]}@upi.example.com`,
    //   type: 'customer'
    // });
    // return contact.id;

    // Mock response
    return `cont_${Date.now()}_${name.replace(/\s+/g, '_')}`;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
};

/**
 * Mask UPI for display purposes
 * @param {string} upi - Full UPI ID
 * @returns {string} Masked UPI
 */
const maskUPI = (upi) => {
  if (!upi || upi.length < 5) return '***';
  const [localPart, domain] = upi.split('@');
  const masked = localPart.substring(0, 2) + '*'.repeat(Math.max(0, localPart.length - 4)) + localPart.substring(localPart.length - 2);
  return `${masked}@${domain}`;
};

/**
 * Create a payment record (for tracking failed/pending payments)
 * @param {Object} paymentRecord - Payment record details
 * @returns {Object} Recorded payment details
 */
const createPaymentRecord = (paymentRecord) => {
  return {
    ...paymentRecord,
    createdAtTimestamp: Date.now(),
    status: paymentRecord.status || 'initiated'
  };
};

module.exports = {
  createOrder,
  processAutomaticPayout,
  getOrCreateFundAccount,
  getOrCreateContact,
  maskUPI,
  createPaymentRecord
};
