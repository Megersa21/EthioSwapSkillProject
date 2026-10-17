import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Discover.css';

const API_URL = 'http://localhost:5000/api';
const PROFILE_KEY = 'swapSkillMyProfile';

const popularSkills = [
  'All skills',
  'Web Development',
  'UI/UX Design',
  'JavaScript',
  'English',
  'Python',
  'Graphic Design',
];

const avatarColors = ['lavender', 'mint', 'peach', 'blue'];

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getInitials(name) {
  return (name || 'Member')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function uniqueSkills(skills) {
  const seen = new Set();

  return skills.filter((skill) => {
    const key = skill.skill_name.trim().toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to discover skill partners.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result;
}

function Discover() {
  const [profile] = useState(readProfile);
  const [partners, setPartners] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All skills');
  const [level, setLevel] = useState('All levels');
  const [availability, setAvailability] = useState('Any time');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('Best match');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [sentRequests, setSentRequests] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setLoading(true);
      setFeedback('');

      try {
        const [discoverResult, mySkillsResult] = await Promise.all([
          apiRequest('/skills/discover'),
          apiRequest('/skills/my-skills'),
        ]);

        if (cancelled) return;

        const otherSkills = Array.isArray(discoverResult.skills)
          ? discoverResult.skills
          : [];

        const ownSkills = Array.isArray(mySkillsResult.skills)
          ? mySkillsResult.skills
          : [];

        setMySkills(ownSkills);

        // Group database skill records into one card per user.
        const grouped = new Map();

        otherSkills.forEach((skill) => {
          const userId = String(skill.user_id);

          if (!grouped.has(userId)) {
            grouped.set(userId, {
              id: userId,
              name: skill.user_name || 'EthioSwapSkill member',
              teaches: [],
              wants: [],
              level: 'Not specified',
              availability: 'Not specified',
              location: 'Location not added',
              rating: null,
              swaps: null,
              match: 0,
            });
          }

          const person = grouped.get(userId);

          if (skill.skill_type === 'teach') {
            person.teaches.push(skill);
          } else if (skill.skill_type === 'learn') {
            person.wants.push(skill.skill_name);
          }

          if (
            skill.skill_type === 'teach' &&
            skill.proficiency_level &&
            person.level === 'Not specified'
          ) {
            person.level = skill.proficiency_level;
          }
        });

        const myLearningSkills = ownSkills
          .filter((skill) => skill.skill_type === 'learn')
          .map((skill) => skill.skill_name.toLowerCase());

        const result = Array.from(grouped.values()).map((person, index) => {
          person.teaches = uniqueSkills(person.teaches);

          const sharedCount = person.teaches.filter((skill) =>
            myLearningSkills.includes(skill.skill_name.toLowerCase()),
          ).length;

          person.match = myLearningSkills.length
            ? Math.round((sharedCount / myLearningSkills.length) * 100)
            : 0;

          person.initials = getInitials(person.name);
          person.color = avatarColors[index % avatarColors.length];

          return person;
        });

        setPartners(result);
      } catch (error) {
        if (!cancelled) {
          console.error('Discover loading error:', error);
          setFeedback(error.message || 'Could not load skill partners.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSkills();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();

    let results = partners.filter((person) => {
      const teaches = person.teaches.map((skill) => skill.skill_name);
      const skills = [...teaches, ...person.wants];

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
      results = [...results].sort((a, b) => b.match - a.match);
    }

    return results;
  }, [partners, search, selectedSkill, level, availability, location, sort]);

  function clearFilters() {
    setSearch('');
    setSelectedSkill('All skills');
    setLevel('All levels');
    setAvailability('Any time');
    setLocation('');
    setSort('Best match');
  }

  async function sendRequest(person) {
    setFeedback('');

    if (sendingTo !== null) return;

    if (sentRequests[person.id]) {
      setFeedback(`Your request to ${person.name} has already been sent.`);
      return;
    }

    // The backend requires one of your teach skills and one of
    // the other user's teach skills.
    const offeredSkill = mySkills.find((skill) => skill.skill_type === 'teach');

    const wantedSkill = person.teaches[0];

    if (!offeredSkill) {
      setFeedback(
        'Add a skill under "What can you teach?" before sending a request.',
      );
      return;
    }

    if (!wantedSkill) {
      setFeedback(
        `${person.name} has no teaching skill available for a swap request yet.`,
      );
      return;
    }

    setSendingTo(person.id);

    try {
      const result = await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          offered_skill_id: offeredSkill.id,
          wanted_skill_id: wantedSkill.id,
          note: `Hello ${person.name}, I would like to exchange skills with you.`,
        }),
      });

      setSentRequests((previous) => ({
        ...previous,
        [person.id]: true,
      }));

      setFeedback(
        result.message ||
          `Your request to ${person.name} was sent successfully.`,
      );
    } catch (error) {
      console.error('Send swap request error:', error);
      setFeedback(error.message || 'Could not send your swap request.');
    } finally {
      setSendingTo(null);
    }
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
                onChange={(event) => setLevel(event.target.value)}
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
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option>Any time</option>
                <option>Not specified</option>
              </select>

              <label htmlFor="filter-location">Location</label>
              <input
                id="filter-location"
                type="text"
                placeholder="Enter a city"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
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
                    {loading
                      ? 'Loading real skill partners...'
                      : `${filteredPartners.length} ${
                          filteredPartners.length === 1 ? 'partner' : 'partners'
                        } found`}
                  </p>
                </div>

                <label className="sort-control">
                  <span>Sort by</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
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

              {loading ? (
                <div className="discover-empty">
                  <h3>Loading skill partners...</h3>
                  <p>Connecting to the EthioSwapSkill database.</p>
                </div>
              ) : feedback && partners.length === 0 ? (
                <div className="discover-empty">
                  <h3>Could not load skill partners</h3>
                  <p>
                    Check that you're logged in and your backend is running.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              ) : filteredPartners.length ? (
                <div className="partner-grid">
                  {filteredPartners.map((person) => (
                    <article className="partner-card" key={person.id}>
                      <div className="partner-card-top">
                        <div className={`partner-avatar ${person.color}`}>
                          {person.initials}
                        </div>
                        <div className="partner-match">
                          <strong>
                            {person.match > 0 ? `${person.match}%` : 'Member'}
                          </strong>
                          <span>
                            {person.match > 0 ? 'skill match' : 'skill partner'}
                          </span>
                        </div>
                      </div>

                      <h3>{person.name}</h3>
                      <p className="partner-location">
                        <span aria-hidden="true">⌖</span> {person.location}
                      </p>

                      <div className="partner-stats">
                        <span>Rating not available yet</span>
                      </div>

                      <div className="partner-skills">
                        <h4>Can teach you</h4>
                        <div className="partner-tags">
                          {person.teaches.length ? (
                            person.teaches.map((skill) => (
                              <span className="teach-tag" key={skill.id}>
                                {skill.skill_name}
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
                        to={`/profile/${person.id}`}
                      >
                        View profile
                        <span aria-hidden="true"> →</span>
                      </Link>

                      <button
                        type="button"
                        className="partner-request-button"
                        disabled={
                          sendingTo !== null || Boolean(sentRequests[person.id])
                        }
                        onClick={() => sendRequest(person)}
                      >
                        {sendingTo === person.id
                          ? 'Sending request...'
                          : sentRequests[person.id]
                            ? 'Request sent'
                            : 'Send skill-swap request'}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="discover-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>No skill partners found</h3>
                  <p>
                    Real users who have listed skills will appear here. You may
                    need a second account to test Discover.
                  </p>
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
