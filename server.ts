import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Type Definitions
interface AnalyticsEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  eventType: string; // 'page_view' | 'section_view' | 'skill_hover' | 'download_resume' | 'contact_click' | 'session_ping'
  eventData?: any;
  userAgent?: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// In-Memory Data Stores
let events: AnalyticsEvent[] = [];
let contactMessages: ContactMessage[] = [];

// Helper to generate seed data for a beautiful analytics dashboard out of the box
function generateSeedData() {
  const seedEvents: AnalyticsEvent[] = [];
  const seedMessages: ContactMessage[] = [];
  const now = new Date();
  
  // Devices and Browsers
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", // Desktop
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/13.1.3", // Desktop
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", // Mobile
    "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/110.0.0.0 Mobile Safari/537.36", // Mobile
    "Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", // Tablet
  ];

  const sections = ["home", "about", "skills", "experience", "education", "contact"];
  const skills = ["Advanced Excel", "Power BI", "MySQL", "Python", "Web Development", "Flutter App Development", "Ethical Hacking"];

  // Generate 7 days of historical seed data
  for (let i = 6; i >= 0; i--) {
    const currentDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Determine traffic volume: more on weekdays, fewer on weekends
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseVisitors = isWeekend ? 10 : 25;
    const visitorCount = Math.floor(baseVisitors + Math.random() * 15);

    for (let j = 0; j < visitorCount; j++) {
      const sessionId = `seed_session_${i}_${j}`;
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // Determine session events: Page View first
      const pageViewTime = new Date(currentDate.getTime());
      pageViewTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      seedEvents.push({
        id: `seed_event_pv_${i}_${j}`,
        sessionId,
        timestamp: pageViewTime.toISOString(),
        eventType: "page_view",
        userAgent: ua,
      });

      // Section views (visitors browse around sections)
      const viewedSections = sections.filter(() => Math.random() > 0.3);
      viewedSections.forEach((sec, sIdx) => {
        const secTime = new Date(pageViewTime.getTime() + (sIdx + 1) * 60 * 1000 * (1 + Math.random() * 5));
        seedEvents.push({
          id: `seed_event_sv_${i}_${j}_${sec}`,
          sessionId,
          timestamp: secTime.toISOString(),
          eventType: "section_view",
          eventData: { section: sec },
          userAgent: ua,
        });
      });

      // Skill hovers
      const hoveredSkills = skills.filter(() => Math.random() > 0.6);
      hoveredSkills.forEach((sk, sIdx) => {
        const skTime = new Date(pageViewTime.getTime() + (sIdx + 1) * 30 * 1000);
        seedEvents.push({
          id: `seed_event_sk_${i}_${j}_${sIdx}`,
          sessionId,
          timestamp: skTime.toISOString(),
          eventType: "skill_hover",
          eventData: { skill: sk },
          userAgent: ua,
        });
      });

      // Actions like resume downloads
      if (Math.random() > 0.8) {
        const actionTime = new Date(pageViewTime.getTime() + 15 * 60 * 1000);
        seedEvents.push({
          id: `seed_event_dl_${i}_${j}`,
          sessionId,
          timestamp: actionTime.toISOString(),
          eventType: "download_resume",
          userAgent: ua,
        });
      }

      // Pings to calculate session duration
      const pingCount = Math.floor(Math.random() * 6) + 1; // 1 to 6 minutes session
      for (let p = 1; p <= pingCount; p++) {
        const pingTime = new Date(pageViewTime.getTime() + p * 60 * 1000);
        seedEvents.push({
          id: `seed_event_png_${i}_${j}_${p}`,
          sessionId,
          timestamp: pingTime.toISOString(),
          eventType: "session_ping",
          userAgent: ua,
        });
      }
    }
  }

  // Generate some elegant feedback/contact seed messages
  const messageDates = [
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  ];

  seedMessages.push({
    id: "msg_1",
    name: "Sathish Kumar",
    email: "sathish.hr@infotech.in",
    message: "Hi Daniyel, saw your portfolio. We are looking for an IT Intern in Coimbatore specializing in Flutter development and Data Analytics. Your B.Sc. IT credentials look very promising. Let us connect!",
    timestamp: messageDates[0].toISOString(),
    read: true,
  });

  seedMessages.push({
    id: "msg_2",
    name: "Elena Rostova",
    email: "elena.r@cybersec-solutions.com",
    message: "Impressive layout, Daniyel. Your blend of Cybersecurity (Ethical Hacking) and Data Operations is highly relevant. Do you have experience with vulnerability scanners like Nessus? Let's discuss potential remote opportunities.",
    timestamp: messageDates[1].toISOString(),
    read: false,
  });

  seedMessages.push({
    id: "msg_3",
    name: "Dr. Rajesh Anandan",
    email: "rajesh.anandan@snr.edu.in",
    message: "Excellent portfolio website, Daniyel! Great work applying your academic learnings from SNR College to build this responsive app. Proud of your progress in B.Sc. IT.",
    timestamp: messageDates[2].toISOString(),
    read: false,
  });

  // Inject Seed Data
  events.push(...seedEvents);
  contactMessages.push(...seedMessages);
}

generateSeedData();

// --- API Endpoints ---

// Get analytics summaries
app.get("/api/analytics/summary", (req, res) => {
  try {
    const totalViews = events.filter(e => e.eventType === "page_view").length;
    
    // Unique Visitors based on sessionId
    const uniqueSessionIds = new Set(events.map(e => e.sessionId));
    const uniqueVisitors = uniqueSessionIds.size;

    // Contact messages summary
    const totalMessages = contactMessages.length;
    const unreadMessages = contactMessages.filter(m => !m.read).length;

    // Resumes downloaded
    const resumeDownloads = events.filter(e => e.eventType === "download_resume").length;

    // Section Views Counts
    const sectionViews: Record<string, number> = {
      home: 0,
      about: 0,
      skills: 0,
      experience: 0,
      education: 0,
      contact: 0,
    };
    events.forEach(e => {
      if (e.eventType === "section_view" && e.eventData?.section) {
        const sec = e.eventData.section.toLowerCase();
        if (sec in sectionViews) {
          sectionViews[sec]++;
        }
      }
    });

    // Skill Hover Counts
    const skillEngagement: Record<string, number> = {};
    events.forEach(e => {
      if (e.eventType === "skill_hover" && e.eventData?.skill) {
        const skill = e.eventData.skill;
        skillEngagement[skill] = (skillEngagement[skill] || 0) + 1;
      }
    });

    // Sessions metrics (Duration calculation)
    // For each unique sessionId, find min and max timestamp
    const sessionDurations: number[] = [];
    uniqueSessionIds.forEach(sid => {
      const sessEvents = events.filter(e => e.sessionId === sid);
      if (sessEvents.length > 1) {
        const times = sessEvents.map(e => new Date(e.timestamp).getTime());
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const durationMin = (maxTime - minTime) / 1000 / 60; // in minutes
        sessionDurations.push(durationMin);
      } else {
        sessionDurations.push(0.5); // single event session is estimated at 30 seconds
      }
    });
    
    const avgSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    // Traffic by Day (last 7 days)
    const dailyTraffic: { date: string; views: number; visitors: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(e => {
        const et = new Date(e.timestamp);
        return et >= dayStart && et <= dayEnd;
      });

      const dayViews = dayEvents.filter(e => e.eventType === "page_view").length;
      const daySessions = new Set(dayEvents.map(e => e.sessionId)).size;

      dailyTraffic.push({
        date: dateStr,
        views: dayViews,
        visitors: daySessions,
      });
    }

    // Devices & Browser Breakdowns based on User Agent
    let desktopCount = 0;
    let mobileCount = 0;
    let tabletCount = 0;

    let chromeCount = 0;
    let safariCount = 0;
    let firefoxCount = 0;
    let otherBrowserCount = 0;

    events.forEach(e => {
      if (e.eventType === "page_view" && e.userAgent) {
        const ua = e.userAgent.toLowerCase();
        
        // Device Type
        if (ua.includes("ipad")) {
          tabletCount++;
        } else if (ua.includes("iphone") || ua.includes("android") || ua.includes("mobile")) {
          mobileCount++;
        } else {
          desktopCount++;
        }

        // Browser Type
        if (ua.includes("chrome") || ua.includes("chromium")) {
          chromeCount++;
        } else if (ua.includes("safari") && !ua.includes("chrome")) {
          safariCount++;
        } else if (ua.includes("firefox")) {
          firefoxCount++;
        } else {
          otherBrowserCount++;
        }
      }
    });

    const totalDeviceSum = (desktopCount + mobileCount + tabletCount) || 1;
    const totalBrowserSum = (chromeCount + safariCount + firefoxCount + otherBrowserCount) || 1;

    const deviceStats = [
      { name: "Desktop", percentage: Math.round((desktopCount / totalDeviceSum) * 100) },
      { name: "Mobile", percentage: Math.round((mobileCount / totalDeviceSum) * 100) },
      { name: "Tablet", percentage: Math.round((tabletCount / totalDeviceSum) * 100) },
    ];

    const browserStats = [
      { name: "Chrome", count: chromeCount },
      { name: "Safari", count: safariCount },
      { name: "Firefox", count: firefoxCount },
      { name: "Other", count: otherBrowserCount },
    ];

    // Recent events list (last 10 items) for activity log
    const recentActivity = events
      .slice(-10)
      .map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        eventType: e.eventType,
        description: e.eventType === "section_view" 
          ? `Viewed Section: ${e.eventData?.section}`
          : e.eventType === "skill_hover"
          ? `Interacted with Skill: ${e.eventData?.skill}`
          : e.eventType === "download_resume"
          ? "Downloaded Resume PDF"
          : e.eventType === "contact_click"
          ? "Clicked Contact Button"
          : e.eventType === "page_view"
          ? "Entered Website"
          : "Active Session Ping",
      }))
      .reverse();

    res.json({
      summary: {
        totalViews,
        uniqueVisitors,
        avgSessionDuration: avgSessionDuration.toFixed(1), // in mins
        resumeDownloads,
        totalMessages,
        unreadMessages,
      },
      sectionViews,
      skillEngagement,
      dailyTraffic,
      deviceStats,
      browserStats,
      recentActivity,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post an analytics event
app.post("/api/analytics/event", (req, res) => {
  const { sessionId, eventType, eventData } = req.body;
  if (!sessionId || !eventType) {
    return res.status(400).json({ error: "Missing sessionId or eventType" });
  }

  const userAgent = req.headers["user-agent"] || "Unknown Device";

  const newEvent: AnalyticsEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    timestamp: new Date().toISOString(),
    eventType,
    eventData,
    userAgent,
  };

  events.push(newEvent);
  res.status(201).json({ success: true, eventId: newEvent.id });
});

// Post a contact message
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }

  const newMessage: ContactMessage = {
    id: `msg_${Date.now()}`,
    name,
    email,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  };

  contactMessages.push(newMessage);

  // Track as an event as well
  const sessionId = req.body.sessionId || `session_${Date.now()}`;
  events.push({
    id: `event_contact_submit_${Date.now()}`,
    sessionId,
    timestamp: new Date().toISOString(),
    eventType: "contact_submit",
    eventData: { name, email },
    userAgent: req.headers["user-agent"] || "Unknown Device",
  });

  res.status(201).json({ success: true, message: newMessage });
});

// Get contact messages
app.get("/api/contacts", (req, res) => {
  res.json(contactMessages);
});

// Mark contact message as read
app.put("/api/contacts/:id/read", (req, res) => {
  const { id } = req.params;
  const msg = contactMessages.find(m => m.id === id);
  if (msg) {
    msg.read = true;
    res.json({ success: true, message: msg });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

// Delete contact message
app.delete("/api/contacts/:id", (req, res) => {
  const { id } = req.params;
  const initialLen = contactMessages.length;
  contactMessages = contactMessages.filter(m => m.id !== id);
  
  if (contactMessages.length < initialLen) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});


// --- Vite Middleware Server Setup ---

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
