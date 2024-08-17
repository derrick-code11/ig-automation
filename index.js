import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DELAY_BETWEEN_REQUESTS = 2000; // 2-second delay to avoid rate limits
const BATCH_SIZE = 10; // Number of DMs sent per batch



/**
 * Extracts short code from post url
 * Example short code is C-v2seOohTy from this post url https://www.instagram.com/p/C-v2seOohTy/?igsh=c25veWxsazRpdnZy
 */
const extractPostIdFromUrl = (postUrl) => {
    const regex = /\/p\/([^\/]+)/;
    const match = postUrl.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error("Invalid Instagram post URL");
  }


/**
 * Takes short code from post URL and converts to mediaId
 */

const codeToMediaId = (shortCode) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let mediaId = 0;
  
    for (const letter of shortCode) {
      mediaId = (mediaId * 64) + alphabet.indexOf(letter);
    }
  
    return mediaId;
  };


/**
 * Fetch all comments from the Instagram post with pagination handling.
 */
const fetchAllComments = async (mediaId) => {
  let comments = [];
  let url = `https://graph.instagram.com/${mediaId}/comments?access_token=${ACCESS_TOKEN}`;

  try {
    while (url) {
      const { data } = await axios.get(url);
      comments = [...comments, ...data.data];
      url = data.paging?.next || null; // Continue if there is a next page

      // To avoid rate limits, we can add a delay between paginated requests
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  } catch (error) {
    console.error('Error fetching comments:', error.response?.data || error.message);
  }

  return comments;
};

/**
 * Extract unique user IDs from the comments.
 */
const extractUniqueUsers = (comments) => {
  const users = new Set();
  comments.forEach(({ from }) => {
    if (from?.id) users.add(from.id);
  });
  return [...users]; // Convert Set back to Array
};

/**
 * Send a Direct Message to a user with retry logic for certain errors.
 */
const sendDM = async (userId, message, retryCount = 3) => {
  const url = `https://graph.facebook.com/v12.0/me/messages?access_token=${ACCESS_TOKEN}`;
  const data = {
    recipient: { id: userId },
    message: { text: message }
  };

  try {
    const { status } = await axios.post(url, data);
    if (status === 200) return { success: true }; // DM sent successfully
  } catch (error) {
    const errorMsg = error.response?.data || error.message;

    // Rate limit error
    if (error.response?.status === 429) {
      console.error(`Rate limit exceeded for user ${userId}: ${errorMsg}`);
      return { success: false, reason: 'RateLimit' };
    }

    // Retry logic for network errors or 5xx errors
    if (retryCount > 0 && (!error.response || error.response.status >= 500)) {
      console.warn(`Retrying to send DM to ${userId}... Attempts left: ${retryCount}`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      return sendDM(userId, message, retryCount - 1);
    }

    console.error(`Failed to send DM to user ${userId}: ${errorMsg}`);
    return { success: false, reason: errorMsg };
  }

  return { success: false, reason: 'Unknown error' };
};

/**
 * Send Direct Messages in batches to avoid hitting rate limits.
 */
const sendDMsToUsersInBatches = async (userIds, message, batchSize = BATCH_SIZE) => {
  const log = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    // Send DMs to the current batch of users
    const batchResults = await Promise.all(batch.map((userId) => sendDM(userId, message)));

    // Log results of this batch
    batch.forEach((userId, index) => {
      const result = batchResults[index];
      log.push({ userId, status: result.success ? 'Success' : 'Failed', reason: result.reason });
    });

    // Introduce a delay between batches to prevent hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS * batchSize));
  }

  return log;
};

/**
 * Log the results to a file.
 */
const logResults = (log) => {
  const logFile = 'dm_log.json';
  const timestampedLog = log.map((entry) => ({
    ...entry,
    timestamp: new Date().toISOString()
  }));

  fs.writeFileSync(logFile, JSON.stringify(timestampedLog, null, 2));
  console.log(`Log saved to ${logFile}`);
};

/**
 * Main function to fetch comments, extract unique users, and send DMs.
 */
const main = async () => {
  const postUrl = 'https://www.instagram.com/p/example-post-id/'; // Replace with actual post URL
  const shortcode = extractPostIdFromUrl(postUrl); // Assume extractPostIdFromUrl is defined elsewhere
  const mediaId = codeToMediaId(shortcode);
  const comments = await fetchAllComments(mediaId);
  const userIds = extractUniqueUsers(comments);
  const message = 'Thank you for your comment!'; // Predefined message goes here

  const log = await sendDMsToUsersInBatches(userIds, message);
  logResults(log);
};

main().catch((error) => console.error('Error in main function:', error));
