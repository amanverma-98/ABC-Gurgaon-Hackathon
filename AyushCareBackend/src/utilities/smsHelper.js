import twilio from 'twilio';

/**
 * Sends an SMS to a target mobile number
 * @param {string} mobileNumber - Target phone number (e.g., +919876543210)
 * @param {string} message - Message body content
 */
export const sendSMS = async (mobileNumber, message) => {
    // If set to mock, simply print the message to terminal
    if (process.env.SMS_PROVIDER === 'mock') {
        console.log(`\n--- [MOCK SMS DISPATCH] ---`);
        console.log(`To: ${mobileNumber}`);
        console.log(`Message: ${message}`);
        console.log(`---------------------------\n`);
        return { success: true, sid: "mock_message_sid_7719" };
    }

    // Live Twilio implementation
    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: mobileNumber
        });

        return { success: true, sid: response.sid };
    } catch (error) {
        console.error("Failed to send SMS via Twilio Gateway:", error);
        throw error;
    }
};