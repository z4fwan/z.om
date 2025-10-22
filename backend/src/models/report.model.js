import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
	{
		// The user who filed the report
		reporter: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		// The user who was reported
		reportedUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		// The reason for the report
		reason: {
			type: String,
			required: [true, "A reason is required for the report."],
			enum: [ // Define allowed reasons
				"Nudity or Sexual Content",
				"Harassment or Hate Speech",
				"Spam or Scams",
				"Threatening Behavior",
				"Underage User",
				"Other",
			],
		},
		// The URL to the screenshot proof (stored on Cloudinary)
		screenshot: {
			type: String,
			required: [true, "A screenshot is required as proof."],
		},
		// The status of the admin review
		status: {
			type: String,
			default: "pending",
			enum: ["pending", "reviewed", "action_taken", "dismissed"],
		},
		// Optional notes from the admin
		adminNotes: {
			type: String,
			default: "",
		},
	},
	{ timestamps: true } // Adds createdAt and updatedAt fields automatically
);

// Add indexes for faster querying in the admin panel
reportSchema.index({ status: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ reportedUser: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;