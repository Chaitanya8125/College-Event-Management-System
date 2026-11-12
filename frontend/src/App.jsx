
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  Users,
  BarChart3,
  Search,
  Bell,
  MapPin,
  Clock,
  ArrowUpRight,
  Plus,
  Filter,
  ChevronRight,
  Sparkles,
  GraduationCap,
  RefreshCw
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000/api/events";
const COMMUNITY_URL = "http://localhost:5000/api/community";
const NOTIFICATIONS_URL = "http://localhost:5000/api/notifications";
const SIGNUP_URL = "http://localhost:5000/api/signup";
const VERIFY_ORGANISER_URL = "http://localhost:5000/api/verify-organiser";
const LOGIN_URL = "http://localhost:5000/api/login";
const REGISTRATION_URL = "http://localhost:5000/api/registrations";
const ANALYTICS_URL = "http://localhost:5000/api/analytics";

const categories = [
  "All Events",
  "Technical Fest",
  "Workshop",
  "Hackathon",
  "Cultural",
  "Sports",
  "Seminar"
];

const categoryColors = {
  "Technical Fest": "purple",
  Workshop: "blue",
  Hackathon: "orange",
  Cultural: "pink",
  Sports: "green",
  Seminar: "cyan"
};

function formatDate(value) {
  if (!value) {
    return { day: "--", month: "---", time: "Time not set" };
  }

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "---", time: "Time not set" };
  }

  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: date
      .toLocaleDateString("en-IN", { month: "short" })
      .toUpperCase(),
    time: date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit"
    })
  };
}

function App() {
  const [events, setEvents] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditEventForm, setShowEditEventForm] = useState(false);


  // Community and notifications state
  const [communityPosts, setCommunityPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [postComments, setPostComments] = useState({});


  // Login state
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Current student for this browser session
  const [currentUser, setCurrentUser] = useState(null);
  async function verifyOrganiserPassword(event) {
  event.preventDefault();
  setEventMessage("");
  setEventLoading(true);

  try {
    const response = await fetch(VERIFY_ORGANISER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ organiserPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Incorrect password.");
    }

    setShowEventForm(true);
    setEventMessage("");
  } catch (error) {
    setEventMessage(error.message);
  } finally {
    setEventLoading(false);
  }
}
async function handleAddEvent(event){
  event.preventDefault();
  setEventMessage("");
  setEventLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...newEvent,
        event_date: newEvent.event_date.replace("T", " ") + ":00",
        organiserPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to add event.");
    }

    setShowAddEvent(false);
    setShowEventForm(false);
    setOrganiserPassword("");
    setNewEvent({
      title: "",
      description: "",
      category: "Workshop",
      event_date: "",
      venue: "",
      capacity: 100
    });

    window.alert("Event added successfully!");
    await loadEvents();

  } catch (error) {
    setEventMessage(error.message);
  } finally {
    setEventLoading(false);
  }
}

async function handleEditEvent(event) {
  event.preventDefault();
  setEventMessage("");
  setEventLoading(true);

  try {
    const response = await fetch(`${API_URL}/${editingEvent.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...editingEvent,
        event_date: editingEvent.event_date.replace("T", " ") + ":00",
        organiserPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update event.");
    }

    setEditingEvent(null);
    setOrganiserPassword("");
    setShowAddEvent(false);
    setShowEventForm(false);

    window.alert("Event updated successfully!");
    await loadEvents();
  } catch (error) {
    setEventMessage(error.message);
  } finally {
    setEventLoading(false);
  }
}

// Delete an event
async function handleDeleteEvent(event) {
  const confirmDelete = window.confirm(
    `Are you sure you want to delete "${event.title}"? Its student registrations will also be deleted.`
  );

  if (!confirmDelete) return;

  const password = window.prompt("Enter organiser password:");

  if (password === null || !password.trim()) {
    return;
  }

  setEventLoading(true);
  setEventMessage("");

  try {
    const response = await fetch(`${API_URL}/${event.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        organiserPassword: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete event.");
    }

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null);
    }

    window.alert("Event deleted successfully!");

    await loadEvents();

    if (currentUser) {
      await fetchMyRegistrations(false);
    }

  } catch (error) {
    window.alert(error.message);
  } finally {
    setEventLoading(false);
  }
}

  // Add Event state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [organiserPassword, setOrganiserPassword] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [eventLoading, setEventLoading] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    category: "Workshop",
    event_date: "",
    venue: "",
    capacity: 100
  });

  // Event registration state
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);

  // My Registrations state
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState("");

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load events from the backend
  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("The server returned an error.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected event data.");
      }

      setEvents(data);
    } catch (err) {
      console.error("Unable to load events:", err);
      setError(
        "Couldn't load events. Check that your backend and MySQL are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  // Search and category filters
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        activeCategory === "All Events" ||
        event.category === activeCategory;

      const matchesSearch = [
        event.title,
        event.description,
        event.venue,
        event.category
      ].some((item) =>
        String(item || "").toLowerCase().includes(term)
      );

      return matchesCategory && matchesSearch;
    });
  }, [events, activeCategory, search]);

  const upcomingCount = events.filter((event) => {
    const date = new Date(String(event.event_date).replace(" ", "T"));

    return (
      String(event.status || "").toLowerCase() === "upcoming" &&
      !Number.isNaN(date.getTime()) &&
      date >= new Date()
    );
  }).length;

  
async function handleLogin(event) {
  event.preventDefault();
  setLoginMessage("");
  setLoginLoading(true);

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    setCurrentUser(data.user);
    setMyRegistrations([]);
    setLoginPassword("");
    setLoginMessage(`Welcome back, ${data.user.name}!`);

    await fetchMyRegistrations(false);
  } catch (err) {
    setLoginMessage(err.message || "Unable to connect to the server.");
  } finally {
    setLoginLoading(false);
  }
}

function openLogin() {
  setLoginMessage("");
  setShowLogin(true);
}

function closeLogin() {
  setShowLogin(false);
  setLoginMessage("");
}

  // Create student account
  async function handleSignup(event) {
    event.preventDefault();
    setSignupMessage("");
    setSignupLoading(true);

    try {
      const response = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create account.");
      }

      setCurrentUser(data.user);
      setMyRegistrations([]);
      setSignupMessage(
        "Account created successfully! You can now register for events."
      );
      setSignupPassword("");
    } catch (err) {
      setSignupMessage(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setSignupLoading(false);
    }
  }

  function openSignup() {
    setSignupMessage("");
    setShowSignup(true);
  }

  function closeSignup() {
    setShowSignup(false);
    setSignupMessage("");
  }

  // Register current student for selected event
  async function handleEventRegistration() {
    if (!selectedEvent) return;

    setRegistrationMessage("");

    if (!currentUser) {
      setShowSignup(true);
      setSignupMessage(
        "Create your student account first. After signup, return to the event to register."
      );
      return;
    }

    setRegistrationLoading(true);

    try {
      const response = await fetch(REGISTRATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          event_id: Number(selectedEvent.id)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to register for this event."
        );
      }

      setRegistrationMessage(
        data.message || "You have registered successfully!"
      );

      // Refresh the registrations if the popup is already open.
      await fetchMyRegistrations(false);
    } catch (err) {
      setRegistrationMessage(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setRegistrationLoading(false);
    }
  }

  // Load registrations from the backend
  async function fetchMyRegistrations(showPopup = true) {
    if (!currentUser) {
      setShowSignup(true);
      setSignupMessage("Please create your student account first.");
      return;
    }

    setRegistrationsLoading(true);
    setRegistrationsError("");

    try {
      const response = await fetch(
        `${REGISTRATION_URL}/${currentUser.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load registrations."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected registrations data.");
      }

      setMyRegistrations(data);

      if (showPopup) {
        setShowRegistrations(true);
      }
    } catch (err) {
      setRegistrationsError(
        err.message || "Unable to connect to the server."
      );

      if (showPopup) {
        setShowRegistrations(true);
      }
    } finally {
      setRegistrationsLoading(false);
    }
  }

  async function loadMyRegistrations() {
    await fetchMyRegistrations(true);
  }

  async function loadAnalytics() {
  setAnalyticsLoading(true);
  setAnalyticsError("");

  try {
    const response = await fetch(ANALYTICS_URL);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load analytics.");
    }

    setAnalytics(data);
    setShowAnalytics(true);
  } catch (error) {
    setAnalyticsError(error.message);
    setShowAnalytics(true);
  } finally {
    setAnalyticsLoading(false);
  }
}

// Load community posts
async function loadCommunity() {
  if (!currentUser) {
    window.alert("Please log in to access the community.");
    return;
  }

  try {
    const response = await fetch(
      `${COMMUNITY_URL}/posts?userId=${currentUser.id}`
    );

    if (!response.ok) throw new Error("Could not load posts.");

    const data = await response.json();
    setCommunityPosts(data);
    setShowCommunity(true);
  } catch (error) {
    window.alert(error.message);
  }
}

// Load notifications
async function loadNotifications() {
  if (!currentUser) {
    window.alert("Please log in to view notifications.");
    return;
  }

  try {
    const response = await fetch(
      `${NOTIFICATIONS_URL}/${currentUser.id}`
    );

    if (!response.ok) throw new Error("Could not load notifications.");

    const data = await response.json();
    setNotifications(data);
    setShowNotifications(true);
  } catch (error) {
    window.alert(error.message);
  }
}

function handleCommunityImageChange(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please choose an image smaller than 5 MB.");
    event.target.value = "";
    return;
  }

  setSelectedImage(file);
  setImagePreview(URL.createObjectURL(file));
}

// create a community post
async function createCommunityPost() {
  if (!currentUser) {
    alert("Please log in to share a post.");
    return;
  }

  if (!newPost.trim() && !selectedImage) {
    alert("Write something or select an image.");
    return;
  }

  try {
    const formData = new FormData();

    formData.append("user_id", String(currentUser.id));
    formData.append("content", newPost);

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    const response = await fetch(`${COMMUNITY_URL}/posts`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not create post.");
    }

    setNewPost("");
    setSelectedImage(null);
    setImagePreview("");

    await loadCommunity();

    alert("Post shared successfully!");
  } catch (error) {
    alert(error.message || "Could not create post.");
  }
}

// Like or unlike a post
async function togglePostLike(postId) {
  try {
    const response = await fetch(
      `${COMMUNITY_URL}/posts/${postId}/like`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not update like.");

    await loadCommunity();
  } catch (error) {
    window.alert(error.message);
  }
}

// Load comments for a post
async function loadPostComments(postId) {
  try {
    const response = await fetch(
      `${COMMUNITY_URL}/posts/${postId}/comments`
    );

    if (!response.ok) throw new Error("Could not load comments.");

    const data = await response.json();
    setPostComments((previous) => ({
      ...previous,
      [postId]: data,
    }));
  } catch (error) {
    window.alert(error.message);
  }
}

// Add a comment to a post
async function addPostComment(postId) {
  const comment = commentInputs[postId]?.trim();

  if (!comment) {
    window.alert("Please enter a comment.");
    return;
  }

  try {
    const response = await fetch(
      `${COMMUNITY_URL}/posts/${postId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          comment,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not add comment.");

    setCommentInputs((previous) => ({
      ...previous,
      [postId]: "",
    }));

    await loadPostComments(postId);
    await loadCommunity();
  } catch (error) {
    window.alert(error.message);
  }
}


  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">
            <GraduationCap size={25} />
          </span>
          <span>
            <strong>Campusly</strong>
            <small>EVENT MANAGEMENT</small>
          </span>
        </a>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="side-nav">
          <a className="nav-link active" href="#home">
            <LayoutDashboard size={19} />
            Dashboard
          </a>

          <a className="nav-link" href="#events">
            <CalendarDays size={19} />
            All Events
            <span className="nav-count">{events.length}</span>
          </a>

          <button
            className="nav-link"
            type="button"
            onClick={loadMyRegistrations}
          >
            <CalendarPlus size={19} />
            My Registrations
            {currentUser && myRegistrations.length > 0 && (
              <span className="nav-count">
                {myRegistrations.length}
              </span>
            )}
          </button>

          <button
            className="nav-link"
            type="button"
            onClick={loadCommunity}
          >
            <Users size={19} />
            Community
          </button>

          <button
             className="nav-link"
             type="button"
             onClick={loadAnalytics}
          >
            <BarChart3 size={19} />
               Analytics
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <Sparkles size={18} />
            </span>

            <strong>Make campus count.</strong>

            <p>
              Discover experiences, learn new skills and meet your community.
            </p>

            <a href="#events">
              Explore events <ArrowUpRight size={15} />
            </a>
          </div>

          <div className="profile-row">
            <div className="avatar">
              {currentUser
                ? currentUser.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "CS"}
            </div>

            <div className="profile-text">
              <strong>{currentUser?.name || "Campus Student"}</strong>
              <span>
                {currentUser ? "Student account" : "Student workspace"}
              </span>
            </div>

            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main-area" id="home">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <strong>Dashboard</strong>
          </div>

          <div className="topbar-actions">
            <span className="today-label">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short"
              })}
            </span>

            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
              onClick={loadNotifications}
            >
              <Bell size={19} />
              {notifications.some((item) => !item.is_read) && (
                <span className="notification-dot" />
              )}
            </button>

            <button
                 className="outline-button"
                 type="button"
                 onClick={openLogin}
            >
              Login
            </button>

            <button             
                  className="outline-button"
                  type="button"
                  onClick={openSignup}
            >
               {currentUser ? "Account created" : "Create account"}
            </button>

            <div className="avatar top-avatar">
              {currentUser
                ? currentUser.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "CS"}
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                YOUR CAMPUS, YOUR COMMUNITY
              </div>

              <h1>
                Discover your next <span>big moment.</span>
              </h1>

              <p className="welcome-description">
                Find events, meet people and make every campus day count.
              </p>
            </div>

            <a className="primary-button" href="#events">
              <Plus size={18} /> Explore events
            </a>
          </section>

          <section className="hero-banner">
            <div className="hero-content">
              <span className="hero-pill">
                <Sparkles size={14} /> CAMPUS HIGHLIGHTS
              </span>

              <h2>
                Ideas become
                <br />
                something amazing.
              </h2>

              <p>
                Your next opportunity to create, connect and grow starts here.
              </p>

              <a href="#events" className="hero-button">
                Discover events <ArrowUpRight size={16} />
              </a>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />

              <div className="art-circle">
                <GraduationCap size={76} strokeWidth={1.2} />
              </div>

              <span className="float-card float-one">
                <Sparkles size={17} /> New ideas
              </span>

              <span className="float-card float-two">
                <Users size={17} /> Your people
              </span>

              <span className="art-star star-one">✳</span>
              <span className="art-star star-two">✦</span>
            </div>
          </section>

          <section className="stats-grid" aria-label="Event statistics">
            <div className="stat-card">
              <div className="stat-top">
                <span>Total events</span>
                <span className="stat-icon violet">
                  <CalendarDays size={19} />
                </span>
              </div>

              <div className="stat-value">
                {String(events.length).padStart(2, "0")}
              </div>

              <div className="stat-foot">Events in the database</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Upcoming events</span>
                <span className="stat-icon teal">
                  <CalendarPlus size={19} />
                </span>
              </div>

              <div className="stat-value">
                {String(upcomingCount).padStart(2, "0")}
              </div>

              <div className="stat-foot">
                <span className="status-dot" />
                Scheduled for the future
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Event categories</span>
                <span className="stat-icon amber">
                  <BarChart3 size={19} />
                </span>
              </div>

              <div className="stat-value">
                {String(
                  new Set(events.map((event) => event.category)).size
                ).padStart(2, "0")}
              </div>

              <div className="stat-foot">
                Different campus experiences
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>My registrations</span>
                <span className="stat-icon rose">
                  <Users size={19} />
                </span>
              </div>

              <div className="stat-value">
                {currentUser ? myRegistrations.length : "—"}
              </div>

              <div className="stat-foot">
                {currentUser
                  ? "Your registered events"
                  : "Create an account to get started"}
              </div>
            </div>
          </section>

          <section className="events-section" id="events">
            <div className="section-heading">
              <div>
                <div className="eyebrow">WHAT'S HAPPENING</div>

                <h2>
                  Explore events{" "}
                  <span className="heading-count">{events.length}</span>
                </h2>

                <p>Find the right event for your interests.</p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
  <button
    className="primary-button"
    type="button"
    onClick={() => {
      setShowAddEvent(true);
      setShowEventForm(false);
      setEventMessage("");
      setOrganiserPassword("");
    }}
  >
    <Plus size={16} /> Add Event
  </button>

  <button className="outline-button" onClick={loadEvents}>
    <RefreshCw size={16} /> Refresh
  </button>
</div>
            </div>

            <div className="event-tools">
              <div className="search-box">
                <Search size={18} />

                <input
                  aria-label="Search events"
                  placeholder="Search events, venues, categories..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button
                className="filter-button"
                onClick={() => {
                  setActiveCategory("All Events");
                  setSearch("");
                }}
              >
                <Filter size={17} /> Reset filters
              </button>
            </div>

            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`category-chip ${
                    activeCategory === category ? "selected" : ""
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {loading && (
              <div className="state-message">
                <RefreshCw className="spin" size={20} />
                Loading events from MySQL...
              </div>
            )}

            {!loading && error && (
              <div className="state-message error-message">
                <span>{error}</span>

                <button className="outline-button" onClick={loadEvents}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filteredEvents.length === 0 && (
              <div className="empty-state">
                <CalendarDays size={30} />
                <strong>No events found</strong>
                <span>Try another search or category.</span>
              </div>
            )}

            {!loading && !error && filteredEvents.length > 0 && (
              <div className="events-grid">
                {filteredEvents.map((event) => {
                  const date = formatDate(event.event_date);
                  const color = categoryColors[event.category] || "blue";

                  return (
                    <article className="event-card" key={event.id}>
                      <div className={`event-cover cover-${color}`}>
                        <span className="event-category">
                          {event.category}
                        </span>

                        <span className="event-date">
                          <strong>{date.day}</strong>
                          <small>{date.month}</small>
                        </span>

                        <div className="cover-decoration">
                          <Sparkles size={34} />
                        </div>
                      </div>

                      <div className={`event-status status-${(event.status || "upcoming").toLowerCase()}`}>
                        <span />
                        {(event.status || "upcoming").charAt(0).toUpperCase() +
                        (event.status || "upcoming").slice(1)}
                      </div>

                        <h3>{event.title}</h3>

                        <p className="event-description">
                          {event.description ||
                            "Join us for this campus experience."}
                        </p>

                        <div className="event-meta">
                          <span>
                            <CalendarDays size={15} /> {date.day} {date.month}
                          </span>

                          <span>
                            <Clock size={15} /> {date.time}
                          </span>
                        </div>

                        <div className="event-meta venue-meta">
                          <span>
                            <MapPin size={15} />{" "}
                            {event.venue || "Venue to be announced"}
                          </span>
                        </div>

                        <div className="event-footer">
                          <span className="capacity-label">
                            <Users size={15} /> Capacity:{" "}
                            {event.capacity ?? "Not specified"}
                          </span>

                          <button
                            className="details-button"
                            onClick={() => {
                              setEditingEvent({
                                ...event,
                                event_date: event.event_date
                                ? event.event_date.replace(" ", "T").slice(0, 16)
                                : ""
                             });
                             setOrganiserPassword("");
                             setEventMessage("");
                             setShowEditEventForm(true);
                           }}
                          >
                             Edit
                          </button>

                          <button
                            className="details-button"
                            type="button"
                            onClick={() => handleDeleteEvent(event)}
                            disabled={eventLoading}
                          >
                            Delete
                          </button>

                          <button
                            className="details-button"
                            onClick={() => {
                              setSelectedEvent(event);
                              setRegistrationMessage("");
                            }}
                          >
                            Details <ArrowUpRight size={15} />
                          </button>
                        </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Event details and registration popup */}
          {selectedEvent && (
            <div
              className="event-modal-overlay"
              onClick={() => setSelectedEvent(null)}
            >
              <div
                className="event-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  aria-label="Close event details"
                  onClick={() => setSelectedEvent(null)}
                >
                  ×
                </button>

                <span className="modal-category">
                  {selectedEvent.category}
                </span>

                <h2 id="event-modal-title">{selectedEvent.title}</h2>

                <p>
                  {selectedEvent.description ||
                    "Join us for this campus experience."}
                </p>

                <div className="modal-details">
                  <p>
                    <strong>Venue:</strong>{" "}
                    {selectedEvent.venue || "To be announced"}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {formatDate(selectedEvent.event_date).day}{" "}
                    {formatDate(selectedEvent.event_date).month}
                  </p>

                  <p>
                    <strong>Time:</strong>{" "}
                    {formatDate(selectedEvent.event_date).time}
                  </p>

                  <p>
                    <strong>Capacity:</strong>{" "}
                    {selectedEvent.capacity ?? "Not specified"} students
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {selectedEvent.status || "Upcoming"}
                  </p>
                </div>

                {registrationMessage && (
                  <p role="status">{registrationMessage}</p>
                )}

                {!currentUser && (
                  <p>
                    Create a student account before registering for an event.
                  </p>
                )}

                <button
                   className="primary-button"
                   onClick={handleEventRegistration}
                   disabled={
                      registrationLoading ||
                      String(selectedEvent.status || "").toLowerCase() === "completed"
                   }
                >
                  {String(selectedEvent.status || "").toLowerCase() === "completed"
                    ? "Event Completed"
                    : registrationLoading
                       ? "Registering..."
                       : "Register for event"}

                  {!registrationLoading &&
                     String(selectedEvent.status || "").toLowerCase() !== "completed" && (
                         <ArrowUpRight size={16} />
                      )}
                </button>

                {!currentUser && (
                  <button
                    className="outline-button"
                    type="button"
                    onClick={openSignup}
                  >
                    Create student account
                  </button>
                )}
              </div>
            </div>
          )}

          {/* My Registrations popup */}
          {showRegistrations && (
            <div
              className="event-modal-overlay"
              onClick={() => setShowRegistrations(false)}
            >
              <div
                className="event-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="registrations-title"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  onClick={() => setShowRegistrations(false)}
                  aria-label="Close registrations"
                >
                  ×
                </button>

                <span className="modal-category">
                  YOUR CAMPUS ACTIVITY
                </span>

                <h2 id="registrations-title">My Registrations</h2>

                <p>Here are the campus events you have registered for.</p>

                <button
                  type="button"
                  className="outline-button"
                  onClick={loadMyRegistrations}
                  disabled={registrationsLoading}
                >
                  <RefreshCw size={15} />
                  {registrationsLoading ? "Refreshing..." : "Refresh"}
                </button>

                {registrationsLoading && (
                  <p>Loading your registrations...</p>
                )}

                {!registrationsLoading && registrationsError && (
                  <div>
                    <p role="alert">{registrationsError}</p>
                    <button
                      className="outline-button"
                      onClick={loadMyRegistrations}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!registrationsLoading &&
                  !registrationsError &&
                  myRegistrations.length === 0 && (
                    <p>
                      You haven't registered for any events yet. Explore
                      events and register to see them here.
                    </p>
                  )}

                {!registrationsLoading &&
                  !registrationsError &&
                  myRegistrations.map((item) => {
                    const date = formatDate(item.event_date);

                    return (
                      <div
                        key={item.registration_id}
                        className="registration-item"
                      >
                        <h3>{item.title}</h3>

                        <p>
                          <strong>Category:</strong>{" "}
                          {item.category || "General"}
                        </p>

                        <p>
                          <strong>Date:</strong> {date.day} {date.month}
                        </p>

                        <p>
                          <strong>Time:</strong> {date.time}
                        </p>

                        <p>
                          <strong>Venue:</strong>{" "}
                          {item.venue || "To be announced"}
                        </p>

                        <p>
                          <strong>Status:</strong>{" "}
                          {item.registration_status || item.status || "Registered"}
                        </p>

                        <hr />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}


          {showLogin && (
              <div className="modal-overlay">
              <div className="modal-content">
                <button
                  type="button"
                  onClick={closeLogin}
                  className="modal-close"
                >
          ✕
                 </button>

          <h2>Welcome Back!</h2>
          <p>Login to your Campusly account</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email:</label>
               <input
                   id="login-email"
                   type="email"
                   placeholder="Enter your email"
                   value={loginEmail}
                   onChange={(e) => setLoginEmail(e.target.value)}
                   required
                />
                <br></br>
                <br></br>

            <label htmlFor="login-password">Password:</label>
                <input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                /><br></br>
                <br></br>

                 {loginMessage && <p>{loginMessage}</p>}

                <button className="primary-button" type="submit" disabled={loginLoading}>
                    {loginLoading ? "Logging in..." : "Login"}
                </button>
           </form>
           <br></br>

            <p>
              Don't have an account?{" "}
              <button className="primary-button" type="button" onClick={() => {
                closeLogin();
                setShowSignup(true);
              }}>
                Create account
              </button>
              
             </p>
           </div>
         </div>
       )}
          {/* Student signup popup */}
          {showSignup && (
            <div
              className="event-modal-overlay"
              onClick={closeSignup}
            >
              <div
                className="event-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="signup-title"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  onClick={closeSignup}
                  aria-label="Close signup"
                >
                  ×
                </button>

                <span className="modal-category">STUDENT ACCOUNT</span>

                <h2 id="signup-title">Create your account</h2>

                <p>
                  Join Campusly and register for campus events.
                </p>

                {currentUser && (
                  <p role="status">
                    You are signed up as {currentUser.name}.
                  </p>
                )}

                <form onSubmit={handleSignup}>
                  <label htmlFor="signup-name">Full name:</label>

                  <input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={(event) =>
                      setSignupName(event.target.value)
                    }
                    required
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Enter your full name"
                  />

                  <br />
                  <br />

                  <label htmlFor="signup-email">Email address:</label>

                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(event) =>
                      setSignupEmail(event.target.value)
                    }
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                  />

                  <br />
                  <br />

                  <label htmlFor="signup-password">Password:</label>

                  <input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(event) =>
                      setSignupPassword(event.target.value)
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />

                  {signupMessage && (
                    <p role="status">{signupMessage}</p>
                  )}

                  <br />
                  <br />

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={signupLoading}
                  >
                    {signupLoading
                      ? "Creating account..."
                      : "Create account"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {showAddEvent && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: "20px",
      overflowY: "auto"
    }}
  >
    <div
      style={{
        background: "white",
        color: "#222",
        padding: "28px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "500px",
        maxHeight: "90vh",
        overflowY: "auto"
      }}
    >
      <button
        type="button"
        onClick={() => {
          setShowAddEvent(false);
          setShowEventForm(false);
          setEventMessage("");
        }}
        style={{ float: "right", cursor: "pointer" }}
      >
        ✕
      </button>

      {!showEventForm ? (
        <>
          <h2>Organiser Access</h2>
          <p>Enter the common organiser password to add an event.</p>

          <form onSubmit={verifyOrganiserPassword}>
            <label>Organiser Password</label>
            <input
              type="password"
              value={organiserPassword}
              onChange={(e) => setOrganiserPassword(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "12px", margin: "10px 0 16px" }}
            />

            {eventMessage && <p style={{ color: "red" }}>{eventMessage}</p>}

            <button className="primary-button" type="submit" disabled={eventLoading}>
              {eventLoading ? "Checking..." : "Verify Password"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2>Add New Event</h2>
          <p>Enter the event details below.</p>

          <form onSubmit={handleAddEvent}>
            <label>Event Title</label>
            <input
              required
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            />

            <label>Description</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            />

            <label>Category</label>
            <select
              value={newEvent.category}
              onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            >
              <option>Workshop</option>
              <option>Technical Fest</option>
              <option>Hackathon</option>
              <option>Cultural</option>
              <option>Sports</option>
              <option>Seminar</option>
            </select>

            <label>Event Date and Time</label>
            <input
              type="datetime-local"
              required
              value={newEvent.event_date}
              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            />

            <label>Venue</label>
            <input
              required
              value={newEvent.venue}
              onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            />

            <label>Maximum Participants</label>
            <input
              type="number"
              min="1"
              required
              value={newEvent.capacity}
              onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
              style={{ display: "block", width: "100%", padding: "10px", margin: "8px 0 14px" }}
            />

            {eventMessage && <p style={{ color: "red" }}>{eventMessage}</p>}

            <button className="primary-button" type="submit" disabled={eventLoading}>
              {eventLoading ? "Adding Event..." : "Add Event"}
            </button>
          </form>
        </>
      )}
    </div>
  </div>
)}

{/* Edit Event popup */}
{showEditEventForm && editingEvent && (
  <div
    className="event-modal-overlay"
    onClick={() => {
      setShowEditEventForm(false);
      setEditingEvent(null);
    }}
  >
    <div
      className="event-modal"
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="modal-close"
        onClick={() => {
          setShowEditEventForm(false);
          setEditingEvent(null);
        }}
      >
        ×
      </button>

      <span className="modal-category">ORGANISER</span>
      <h2>Edit Event</h2>
      <p>Update the event details below.</p>

      <form onSubmit={handleEditEvent}>
        <label>Event Title</label>
        <input
          required
          value={editingEvent.title}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              title: event.target.value
            })
          }
        />

        <br /><br />

        <label>Description</label>
        <textarea
          value={editingEvent.description || ""}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              description: event.target.value
            })
          }
        />

        <br /><br />

        <label>Category</label>
        <select
          value={editingEvent.category}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              category: event.target.value
            })
          }
        >
          <option>Workshop</option>
          <option>Technical Fest</option>
          <option>Hackathon</option>
          <option>Cultural</option>
          <option>Sports</option>
          <option>Seminar</option>
        </select>

                <label>Event Status</label>
        <select
          value={editingEvent.status || "upcoming"}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              status: event.target.value
            })
          }
        >
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <br /><br />

        <br /><br />

        <label>Event Date and Time</label>
        <input
          type="datetime-local"
          required
          value={editingEvent.event_date}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              event_date: event.target.value
            })
          }
        />

        <br /><br />

        <label>Venue</label>
        <input
          required
          value={editingEvent.venue}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              venue: event.target.value
            })
          }
        />

        <br /><br />

        <label>Maximum Participants</label>
        <input
          type="number"
          min="1"
          required
          value={editingEvent.capacity}
          onChange={(event) =>
            setEditingEvent({
              ...editingEvent,
              capacity: event.target.value
            })
          }
        />

        <br /><br />

        <label>Organiser Password</label>
        <input
          type="password"
          required
          value={organiserPassword}
          onChange={(event) =>
            setOrganiserPassword(event.target.value)
          }
        />

        {eventMessage && (
          <p style={{ color: "red" }}>{eventMessage}</p>
        )}

        <br />

        <button
          className="primary-button"
          type="submit"
          disabled={eventLoading}
        >
          {eventLoading ? "Updating..." : "Update Event"}
        </button>
      </form>
    </div>
  </div>
)}

{/* Analytics Dashboard */}
{showAnalytics && (
  <div className="event-modal-overlay">
    <div
      className="event-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-title"
      style={{ maxWidth: "750px", width: "100%" }}
    >
      <button
        className="modal-close"
        onClick={() => setShowAnalytics(false)}
        aria-label="Close analytics"
      >
        ×
      </button>

      <span className="modal-category">CAMPUSLY REPORTS</span>

      <h2 id="analytics-title">Event Analytics</h2>
      <p>Overview of events and student participation.</p>

      {analyticsLoading && <p>Loading analytics...</p>}

      {analyticsError && (
        <div>
          <p role="alert">{analyticsError}</p>
          <button className="outline-button" onClick={loadAnalytics}>
            Try again
          </button>
        </div>
      )}

      {!analyticsLoading && !analyticsError && analytics && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Events</span>
              <div className="stat-value">
                {analytics.eventStats.totalEvents}
              </div>
            </div>

            <div className="stat-card">
              <span>Upcoming Events</span>
              <div className="stat-value">
                {analytics.eventStats.upcomingEvents || 0}
              </div>
            </div>

            <div className="stat-card">
              <span>Categories</span>
              <div className="stat-value">
                {analytics.eventStats.totalCategories}
              </div>
            </div>

            <div className="stat-card">
              <span>Total Registrations</span>
              <div className="stat-value">
                {analytics.registrationStats.totalRegistrations}
              </div>
            </div>

            <div className="stat-card">
              <span>Registered Students</span>
              <div className="stat-value">
                {analytics.registrationStats.registeredStudents}
              </div>
            </div>
          </div>

          <h3>Popular Events</h3>

          <div style={{ margin: "20px 0" }}>
  {analytics.popularEvents.map((event) => {
    const maxRegistrations = Math.max(
      ...analytics.popularEvents.map((item) =>
        Number(item.registrations) || 0
      ),
      1
    );

    const percentage =
      ((Number(event.registrations) || 0) / maxRegistrations) * 100;

    return (
      <div key={event.id} style={{ marginBottom: "18px" }}>
        <strong>{event.title}</strong>

        <div
          style={{
            background: "#e8eaf0",
            height: "14px",
            borderRadius: "10px",
            marginTop: "7px",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              background: "#7656d6",
              borderRadius: "10px"
            }}
          />
        </div>

        <small>Registrations: {event.registrations}</small>
      </div>
    );
  })}
</div>

          {analytics.popularEvents.length === 0 ? (
            <p>No events available yet.</p>
          ) : (
            analytics.popularEvents.map((event) => (
              <div
                key={event.id}
                className="registration-item"
              >
                <strong>{event.title}</strong>
                <p>Registrations: {event.registrations}</p>
              </div>
            ))
          )}
        </>
      )}

      <button
        className="outline-button"
        onClick={loadAnalytics}
        disabled={analyticsLoading}
      >
        <RefreshCw size={15} />
        Refresh Analytics
      </button>
    </div>
  </div>
)}


{showCommunity && (
  <div className="event-modal-overlay">
    <div className="event-modal community-modal">
      <button
        className="modal-close"
        onClick={() => setShowCommunity(false)}
      >
        ×
      </button>

      <h2>Campus Community</h2>
      <p>Share updates and connect with other students.</p>

      <div className="community-create">
        <textarea
          value={newPost}
          onChange={(event) => setNewPost(event.target.value)}
          placeholder="What's happening on campus?"
          rows="3"
        /><br></br>
        <br></br>
        <label className="image-upload-button">
  📷 Add Photo
  <input
    type="file"
    accept="image/*"
    onChange={handleCommunityImageChange}
    hidden
  />
</label>

{imagePreview && (
  <div className="image-preview">
    <img src={imagePreview} alt="Selected preview" />

    <button
      type="button"
      onClick={() => {
        setSelectedImage(null);
        setImagePreview("");
      }}
    >
      Remove image
    </button>
  </div>
)}
        <button
          className="primary-button"
          type="button"
          onClick={createCommunityPost}
        >
          Share Post
        </button>
      </div>

      <div className="community-post-list">
        {communityPosts.length === 0 ? (
          <p>No posts yet. Be the first to share something!</p>
        ) : (
          communityPosts.map((post) => (
            <div className="community-post" key={post.id}>
              <h3>{post.author}</h3>
              <p>{post.content}</p>
              {post.image_url && (
                <img
                  className="community-post-image"
                  src={`http://localhost:5000${post.image_url}`}
                  alt="Community post"
                />
              )}
              <small>
                {new Date(post.created_at).toLocaleString()}
              </small>

              <div className="community-actions">
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => togglePostLike(post.id)}
                >
                  {Number(post.liked_by_user) ? "Unlike" : "Like"}
                  {" "}({post.likes_count})
                </button>

                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loadPostComments(post.id)}
                >
                  Comments ({post.comments_count})
                </button>
              </div>

              {postComments[post.id] && (
                <div className="community-comments">
                  {postComments[post.id].map((comment) => (
                    <p key={comment.id}>
                      <strong>{comment.author}:</strong> {comment.comment}
                    </p>
                  ))}

                  <div className="comment-input-row">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ""}
                      onChange={(event) =>
                        setCommentInputs((previous) => ({
                          ...previous,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="Write a comment..."
                    />
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => addPostComment(post.id)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}

          <footer className="page-footer">
            <span>
              © {new Date().getFullYear()} Campusly · College Event Management
              System
            </span>

            <span className="footer-status">
              <span /> Connected to campus API
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
