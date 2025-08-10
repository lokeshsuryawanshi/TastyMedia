
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
export async function POST(request: NextRequest) {
  try {
    const { name, mobile, gmail, services, message } = await request.json();

    // Configure the transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER, // Access from environment variables
        pass: process.env.EMAIL_PASS, // Access from environment variables
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender's email
      to: process.env.EMAIL_USER,   // Recipient's email
      subject: 'New Get In Touch Form Submission',
      text: `
        Name: ${name}
        Mobile: ${mobile}
        Gmail: ${gmail}
        Services: ${services}
        Message: ${message}
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: (error as Error).message });
  }
}


export function calculateCost(params: CalculationParams): CalculationResult {
    const { facility, automation, unit, siteSize, crop, frameType } = params;
    let calculatedCost = 0;
    let sizeInSqm = unit === "sqft" ? siteSize / 10.7639 : siteSize;
    let exceedsRange = false;
    let rangeExceededMessage = "";

    if (facility === "GreenHouse") {
        if (sizeInSqm > 6000) {
            exceedsRange = true;
            rangeExceededMessage = "To get estimates for greenhouse farms above 6000 sqm, please connect with us and book a call.";
            return { cost: 0, exceedsRange, rangeExceededMessage };
        }
        for (const range of greenhouseRanges) {
            if (sizeInSqm <= range.max) {
                const rate = range.rate;
                const automationCost = range.automationCosts[automation as keyof typeof range.automationCosts];
                calculatedCost = sizeInSqm * rate + automationCost;
                break;
            }
        }
    } else if (facility === "VerticalFarm") {
        const cropTypeCategory = isLeafyGreen.includes(crop) ? 'Leafy' : 'Vine';
        const maxRange = cropTypeCategory === 'Leafy' ? 3968 : 6016;

        if (sizeInSqm > maxRange) {
            exceedsRange = true;
            rangeExceededMessage = `To get estimates for vertical farms above ${maxRange} sqm, please connect with us and book a call.`;
            return { cost: 0, exceedsRange, rangeExceededMessage };
        }
        for (const range of verticalFarmingRanges[cropTypeCategory as keyof typeof verticalFarmingRanges]) {
            if (sizeInSqm <= range.max) {
                const rate = range.rate;
                const additionalCost = cropTypeCategory === 'Leafy' ? (range[frameType.toLowerCase() as keyof typeof range] || 0) : 0;
                calculatedCost = sizeInSqm * rate + additionalCost;
                break;
            }
        }
    }

    return { cost: calculatedCost, exceedsRange, rangeExceededMessage };
}