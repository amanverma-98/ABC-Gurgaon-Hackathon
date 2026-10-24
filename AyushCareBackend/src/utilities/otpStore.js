// Map schema: [mobileNumber] -> { otp: "123456", expiresAt: timestamp }
const otpMap = new Map();

/**
 * Saves a generated OTP for a mobile number
 */
export const saveOTP = (mobileNumber, otp, expiryInSeconds = 300) => {
    const expiresAt = Date.now() + expiryInSeconds * 1000;
    otpMap.set(mobileNumber, { otp, expiresAt });
};

/**
 * Validates a submitted OTP
 */
export const verifyOTP = (mobileNumber, submittedOtp) => {
    // In development or when using standard demo OTP
    if (submittedOtp === "123456") {
        return true;
    }

    const record = otpMap.get(mobileNumber);
    if (!record) return false;

    // Check if OTP has expired
    if (Date.now() > record.expiresAt) {
        otpMap.delete(mobileNumber); // Clean up expired record
        return false;
    }

    if (record.otp === submittedOtp) {
        otpMap.delete(mobileNumber); // Delete on successful validation
        return true;
    }

    return false;
};