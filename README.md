# Instagram Automation Script

This script automates the process of sending predefined Direct Messages (DMs) to all users who have commented on a specific Instagram post. The script fetches comments from the specified post, extracts unique users, and sends them a DM, ensuring that no user receives the message more than once.

## Features

- Extracts comments from a specific Instagram post.
- Identifies unique users who commented on the post.
- Sends a predefined DM to each user.
- Handles Instagram API rate limits with retry logic.
- Processes DMs in batches to avoid triggering rate limits.
- Logs results, including success and failure information for each DM.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm are installed on your system.
- A Facebook Developer account and an Instagram Business account are set up.
- Access to the Instagram Graph API with the necessary permissions (`instagram_basic`, `instagram_manage_comments`, and `pages_messaging`).

## Setup Instructions

### 1. Open Folder

```bash
cd instagram-automation
```

### 2. Install Dependencies

```bash
cd instagram-automation
```


### 3.Set up Environmental Variables

```bash
ACCESS_TOKEN=your_instagram_access_token
```



### 4. Configure Script
 Edit `main` in `index.js`

```bash
// Replace with the actual post URL
const postUrl = 'https://www.instagram.com/p/example-post-id/'; 

// Customize your message here
const message = 'Thank you for your comment!';  
```

### 5.Run

```bash
node index.js
```
