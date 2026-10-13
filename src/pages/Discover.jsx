import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Discover.css';

const PROFILE_KEY = 'swapSkillMyProfile';
const LISTINGS_KEY = 'swapSkillListings';
const REQUESTS_KEY = 'swapSkillRequests';
const NOTIFICATIONS_KEY = 'swapSkillNotifications';

const samplePartners = [
  {
    id: 1,
    name: 'Hana Bekele',
    initials: 'HB',
    location: 'Addis Ababa',
    teaches: ['UI/UX Design', 'Figma'],
    wants: ['React', 'JavaScript'],
    level: 'Intermediate',
    availability: 'Weekends',
    rating: 4.9,
    swaps: 12,
    match: 92,
    color: 'lavender',
  },
  {
    id: 2,
    name: 'Dawit Alemu',
    initials: 'DA',
    location: 'Dire Dawa',
    teaches: ['JavaScript', 'React'],
    wants: ['UI/UX Design', 'Figma'],
    level: 'Advanced',
    availability: 'Evenings',
    rating: 4.8,
    swaps: 9,
    match: 88,
    color: 'mint',
  },
  {
    id: 3,
    name: 'Sara Mohammed',
    initials: 'SM',
    location: 'Hawassa',
    teaches: ['English', 'Public Speaking'],
    wants: ['Web Development', 'Python'],
    level: 'Intermediate',
    availability: 'Weekends',
    rating: 4.7,
    swaps: 7,
    match: 85,
    color: 'peach',
  },
  {
    id: 4,
    name: 'Yonas Tadesse',
    initials: 'YT',
    location: 'Addis Ababa',
    teaches: ['Python', 'Web Development'],
    wants: ['English', 'Public Speaking'],
    level: 'Beginner',
    availability: 'Evenings',
    rating: 4.8,
    swaps: 6,
    match: 81,
    color: 'blue',
  },
];

const popularSkills = [
  'All skills',
  'Web Development',
  'UI/UX Design',
  'JavaScript',
  'English',
  'Python',
  'Graphic Design',
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
    return false;
  }
}

function uniqueSkills(skills) {
  const seen = new Set();

  return skills
    .filter((skill) => {
      if (typeof skill !== 'string' || !skill.trim()) return false;
      const normalized = skill.trim().toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((skill) => skill.trim());
}

function getInitials(name) {
  return (name || 'You')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getRequestStatus(requests, person) {
  const matching = requests.filter((request) => {
    const direction = String(request.direction || '').toLowerCase();
    if (!['sent', 'outgoing'].includes(direction)) return false;

    return (
      String(request.receiverId || '') === String(person.id) ||
      String(request.receiverName || '').toLowerCase() ===
        person.name.toLowerCase()
    );
  });

  if (matching.some((request) => request.status === 'accepted')) {
    return 'accepted';
  }

  if (
    matching.some(
      (request) =>
        String(request.status || 'pending').toLowerCase() === 'pending',
    )
  ) {
    return 'pending';
  }

  return '';
}

function Discover() {
  const [profile, setProfile] = useState(() => readStorage(PROFILE_KEY, {}));
  const [listings, setListings] = useState(() => readStorage(LISTINGS_KEY, []));
  const [requests, setRequests] = useState(() => readStorage(REQUESTS_KEY, []));

  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All skills');
  const [level, setLevel] = useState('All levels');
  const [availability, setAvailability] = useState('Any time');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('Best match');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    function refresh() {
      setProfile(readStorage(PROFILE_KEY, {}));

      const savedListings = readStorage(LISTINGS_KEY, []);
      setListings(Array.isArray(savedListings) ? savedListings : []);

      const savedRequests = readStorage(REQUESTS_KEY, []);
      setRequests(Array.isArray(savedRequests) ? savedRequests : []);
    }

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('swapSkillRequestsUpdated', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('swapSkillRequestsUpdated', refresh);
    };
  }, []);

  const myPartnerProfile = useMemo(() => {
    const validListings = Array.isArray(listings) ? listings : [];
    const teaches = uniqueSkills(validListings.map((item) => item.teachSkill));
    const wants = uniqueSkills(validListings.map((item) => item.learnSkill));

    const hasProfile =
      profile &&
      typeof profile === 'object' &&
      (profile.name ||
        profile.fullName ||
        profile.location ||
        profile.bio ||
        teaches.length ||
        wants.length);

    if (!hasProfile) return null;

    const firstListing = validListings[0] || {};

    return {
      id: 'me',
      name: profile.name || profile.fullName || 'Your profile',
      initials: getInitials(profile.name || profile.fullName || 'You'),
      location: profile.location || 'Location not added',
      teaches,
      wants,
      level: firstListing.teachLevel || 'Not specified',
      availability: firstListing.availability || 'Flexible',
      rating: null,
      swaps: null,
      match: null,
      color: 'mint',
      isOwnProfile: true,
    };
  }, [profile, listings]);

  const allPartners = useMemo(
    () => [...(myPartnerProfile ? [myPartnerProfile] : []), ...samplePartners],
    [myPartnerProfile],
  );

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();

    let results = allPartners.filter((person) => {
      const skills = [...person.teaches, ...person.wants];

      return (
        (!query ||
          person.name.toLowerCase().includes(query) ||
          person.location.toLowerCase().includes(query) ||
          skills.some((skill) => skill.toLowerCase().includes(query))) &&
        (selectedSkill === 'All skills' ||
          skills.some(
            (skill) => skill.toLowerCase() === selectedSkill.toLowerCase(),
          )) &&
        (level === 'All levels' || person.level === level) &&
        (availability === 'Any time' || person.availability === availability) &&
        (!locationQuery ||
          person.location.toLowerCase().includes(locationQuery))
      );
    });

    if (sort === 'Highest rated') {
      results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'Most swaps') {
      results = [...results].sort((a, b) => (b.swaps || 0) - (a.swaps || 0));
    } else {
      results = [...results].sort((a, b) => (b.match || 0) - (a.match || 0));
    }

    return results;
  }, [allPartners, search, selectedSkill, level, availability, location, sort]);

  function clearFilters() {
    setSearch('');
    setSelectedSkill('All skills');
    setLevel('All levels');
    setAvailability('Any time');
    setLocation('');
    setSort('Best match');
  }

  function sendRequest(person) {
    setFeedback('');

    if (person.isOwnProfile) {
      setFeedback('You cannot send a request to your own profile.');
      return;
    }

    const saved = readStorage(REQUESTS_KEY, []);
    const currentRequests = Array.isArray(saved) ? saved : [];

    const duplicate = currentRequests.some((request) => {
      const direction = String(request.direction || '').toLowerCase();
      const samePartner =
        String(request.receiverId || '') === String(person.id) ||
        (['sent', 'outgoing'].includes(direction) &&
          String(request.receiverName || '').toLowerCase() ===
            person.name.toLowerCase());

      return (
        samePartner &&
        ['pending', 'accepted'].includes(
          String(request.status || 'pending').toLowerCase(),
        )
      );
    });

    if (duplicate) {
      setRequests(currentRequests);
      setFeedback(
        `You already have a pending or accepted request with ${person.name}.`,
      );
      return;
    }

    const myName =
      profile?.name ||
      profile?.fullName ||
      profile?.displayName ||
      'SwapSkill member';

    const newRequest = {
      id: createId(),
      direction: 'sent',
      senderId: String(profile?.id || 'me'),
      senderName: myName,
      receiverId: String(person.id),
      receiverName: person.name,
      teachSkill: person.wants[0] || 'Skill exchange',
      learnSkill: person.teaches[0] || 'Skill exchange',
      note: `Hello ${person.name}, I would like to exchange skills with you.`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updatedRequests = [newRequest, ...currentRequests];

    if (!writeStorage(REQUESTS_KEY, updatedRequests)) {
      setFeedback('Could not save your request. Please try again.');
      return;
    }

    setRequests(updatedRequests);

    const savedNotifications = readStorage(NOTIFICATIONS_KEY, []);
    const notifications = Array.isArray(savedNotifications)
      ? savedNotifications
      : [];

    writeStorage(NOTIFICATIONS_KEY, [
      {
        id: createId(),
        title: 'Skill-swap request sent',
        message: `Your request to ${person.name} has been saved.`,
        type: 'request',
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...notifications,
    ]);

    window.dispatchEvent(new Event('swapSkillRequestsUpdated'));
    window.dispatchEvent(new Event('swapSkillNotificationsUpdated'));

    setFeedback(`Your request to ${person.name} was sent successfully.`);
  }

  return (
    <>
      <main className="discover-page">
        <section className="discover-heading">
          <span className="discover-eyebrow">YOUR NEXT SKILL STARTS HERE</span>
          <h1>Discover your next skill partner</h1>
          <p>
            Connect with people who can teach you something new. Share what you
            know and learn together.
          </p>

          <div className="discover-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search skills or people"
              placeholder="Search skills, people, or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" onClick={() => {}}>
              Search
            </button>
          </div>
        </section>

        <section className="discover-content">
          <div className="popular-skills">
            <h2>Popular skills</h2>
            <div className="skill-chips">
              {popularSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={
                    selectedSkill === skill ? 'skill-chip active' : 'skill-chip'
                  }
                  onClick={() => setSelectedSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="discover-layout">
            <aside className="discover-filters">
              <div className="filter-heading">
                <h2>Filters</h2>
                <button type="button" onClick={clearFilters}>
                  Clear all
                </button>
              </div>

              <label htmlFor="filter-level">Skill level</label>
              <select
                id="filter-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option>All levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
                <option>Not specified</option>
              </select>

              <label htmlFor="filter-availability">Availability</label>
              <select
                id="filter-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option>Any time</option>
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Evenings</option>
                <option>Flexible</option>
              </select>

              <label htmlFor="filter-location">Location</label>
              <input
                id="filter-location"
                type="text"
                placeholder="Enter a city"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <div className="filter-note">
                <span aria-hidden="true">⇄</span>
                <strong>Skills are better shared.</strong>
                <p>
                  Find someone to learn from and share your knowledge in return.
                </p>
              </div>
            </aside>

            <div className="discover-results">
              <div className="results-toolbar">
                <div>
                  <h2>Skill partners</h2>
                  <p>
                    {filteredPartners.length}{' '}
                    {filteredPartners.length === 1 ? 'partner' : 'partners'}{' '}
                    found
                  </p>
                </div>

                <label className="sort-control">
                  <span>Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Sort partners"
                  >
                    <option>Best match</option>
                    <option>Highest rated</option>
                    <option>Most swaps</option>
                  </select>
                </label>
              </div>

              {feedback && (
                <p className="discover-feedback" role="status">
                  {feedback}
                </p>
              )}

              {filteredPartners.length ? (
                <div className="partner-grid">
                  {filteredPartners.map((person) => {
                    const status = getRequestStatus(requests, person);

                    return (
                      <article className="partner-card" key={person.id}>
                        <div className="partner-card-top">
                          <div className={`partner-avatar ${person.color}`}>
                            {person.initials}
                          </div>
                          <div className="partner-match">
                            {person.isOwnProfile ? (
                              <>
                                <strong>You</strong>
                                <span>Your listing</span>
                              </>
                            ) : (
                              <>
                                <strong>{person.match}%</strong>
                                <span>match</span>
                              </>
                            )}
                          </div>
                        </div>

                        <h3>{person.name}</h3>
                        <p className="partner-location">
                          <span aria-hidden="true">⌖</span> {person.location}
                        </p>

                        <div className="partner-stats">
                          {person.isOwnProfile ? (
                            <span>Your profile</span>
                          ) : (
                            <>
                              <span>★ {person.rating}</span>
                              <span>{person.swaps} successful swaps</span>
                            </>
                          )}
                        </div>

                        <div className="partner-skills">
                          <h4>Can teach you</h4>
                          <div className="partner-tags">
                            {person.teaches.length ? (
                              person.teaches.map((skill) => (
                                <span className="teach-tag" key={skill}>
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="teach-tag">
                                No teaching skills added
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="partner-skills">
                          <h4>Wants to learn</h4>
                          <div className="partner-tags">
                            {person.wants.length ? (
                              person.wants.map((skill) => (
                                <span className="want-tag" key={skill}>
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="want-tag">
                                No learning skills added
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="partner-card-footer">
                          <span>{person.level}</span>
                          <span>{person.availability}</span>
                        </div>

                        <Link
                          className="partner-profile-link"
                          to={
                            person.isOwnProfile
                              ? '/profile/me'
                              : `/profile/${person.id}`
                          }
                        >
                          {person.isOwnProfile
                            ? 'View your profile'
                            : 'View profile'}
                          <span aria-hidden="true"> →</span>
                        </Link>

                        {!person.isOwnProfile && (
                          <button
                            type="button"
                            className="partner-request-button"
                            onClick={() => sendRequest(person)}
                          >
                            {status === 'accepted'
                              ? 'Request accepted'
                              : status === 'pending'
                                ? 'Request pending — click to check'
                                : 'Send skill-swap request'}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="discover-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>No skill partners found</h3>
                  <p>Try another search or clear some filters.</p>
                  <button type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Discover;
