import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Discover.css';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const AVATAR_COLORS = ['lavender', 'mint', 'peach', 'blue'];

const POPULAR_SKILLS = [
  'All skills',
  'Web Development',
  'UI/UX Design',
  'JavaScript',
  'English',
  'Python',
  'Graphic Design',
];

async function apiRequest(path, options = {}) {
  // The token is used only for authentication, not for application data.
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to discover and exchange skills.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Request failed (${response.status}).`,
    );
  }

  return result;
}

function normalizeSkillType(type) {
  return String(type || '')
    .trim()
    .toLowerCase();
}

function normalizeLevel(level) {
  if (!level) return 'Not specified';

  const value = String(level).trim().toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U'
  );
}

function getSkillsFromResponse(result) {
  return Array.isArray(result?.skills) ? result.skills : [];
}

function getRequestsFromResponse(result) {
  return Array.isArray(result?.requests) ? result.requests : [];
}

function getPartnerIdFromRequest(request) {
  // A sent request's partner is the recipient.
  return request.recipient_id ?? request.recipientId;
}

function getRequestStatus(requests, partnerId) {
  const matching = requests.filter(
    (request) =>
      String(getPartnerIdFromRequest(request)) === String(partnerId) &&
      ['pending', 'accepted'].includes(
        String(request.status || '').toLowerCase(),
      ),
  );

  if (
    matching.some(
      (request) => String(request.status).toLowerCase() === 'accepted',
    )
  ) {
    return 'accepted';
  }

  if (
    matching.some(
      (request) => String(request.status).toLowerCase() === 'pending',
    )
  ) {
    return 'pending';
  }

  return '';
}

function Discover() {
  const [mySkills, setMySkills] = useState([]);
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All skills');
  const [level, setLevel] = useState('All levels');
  const [availability, setAvailability] = useState('Any time');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('Best match');

  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadDiscoverData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [discoverResult, mySkillsResult, requestsResult] =
        await Promise.all([
          apiRequest('/skills/discover'),
          apiRequest('/skills/my-skills'),
          apiRequest('/requests?direction=sent'),
        ]);

      console.log('RAW MY SKILLS RESPONSE:', mySkillsResult);
      console.log(
        'PARSED MY SKILLS RESPONSE:',
        getSkillsFromResponse(mySkillsResult),
      );

      const discoveredSkills = getSkillsFromResponse(discoverResult);

      const ownSkills = getSkillsFromResponse(mySkillsResult);
      console.log('MY SKILLS:', ownSkills);

      console.log(
        'TEACHING SKILLS:',
        ownSkills.filter(
          (skill) => String(skill.skill_type).trim().toLowerCase() === 'teach',
        ),
      );
      const sentRequests = getRequestsFromResponse(requestsResult);
      console.log('BEFORE SET STATE — ownSkills:', ownSkills);

      setMySkills(ownSkills);

      console.log('AFTER SET STATE — ownSkills:', ownSkills);
      setMySkills(ownSkills);
      setRequests(sentRequests);
      console.log('BEFORE SET STATE — ownSkills:', ownSkills);

      setMySkills(ownSkills);

      console.log('AFTER SET STATE — ownSkills:', ownSkills);

      // Group all database skill records into one card per member.
      const grouped = new Map();

      discoveredSkills.forEach((skill) => {
        const userId = skill.user_id ?? skill.userId;

        if (userId == null) return;

        const key = String(userId);
        const userName =
          skill.user_name || skill.full_name || 'SkillSwap member';

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            name: userName,
            initials: getInitials(userName),
            location: skill.location || 'Location not provided',
            title: skill.title || 'Skill Swap Member',
            profilePicture: skill.profile_image || '',
            teaches: [],
            teachSkillIds: {},
            wants: [],
            levels: [],
            availability: skill.availability || 'Not specified',
            rating: null,
            swaps: null,
            color: AVATAR_COLORS[grouped.size % AVATAR_COLORS.length],
          });
        }

        const person = grouped.get(key);
        const skillName = String(skill.skill_name || '').trim();

        if (!skillName) return;

        const type = normalizeSkillType(skill.skill_type);

        if (type === 'teach') {
          const normalizedName = skillName.toLowerCase();

          if (
            !person.teaches.some(
              (name) => name.toLowerCase() === normalizedName,
            )
          ) {
            person.teaches.push(skillName);
            person.teachSkillIds[normalizedName] = skill.id;
            person.levels.push(normalizeLevel(skill.proficiency_level));
          }
        } else if (type === 'learn') {
          if (
            !person.wants.some(
              (name) => name.toLowerCase() === skillName.toLowerCase(),
            )
          ) {
            person.wants.push(skillName);
          }
        }
      });

      const ownTeachSkills = ownSkills.filter(
        (skill) => normalizeSkillType(skill.skill_type) === 'teach',
      );

      const ownLearnNames = new Set(
        ownSkills
          .filter((skill) => normalizeSkillType(skill.skill_type) === 'learn')
          .map((skill) =>
            String(skill.skill_name || '')
              .trim()
              .toLowerCase(),
          ),
      );

      const formattedPartners = Array.from(grouped.values()).map((person) => {
        const matchingSkills = person.teaches.filter((skill) =>
          ownLearnNames.has(skill.toLowerCase()),
        );

        const match = person.teaches.length
          ? Math.round((matchingSkills.length / person.teaches.length) * 100)
          : 0;

        return {
          ...person,
          level: person.levels[0] || 'Not specified',
          match,
          matchingSkills,
        };
      });

      setPartners(formattedPartners);
    } catch (requestError) {
      setError(requestError.message || 'Could not load skill partners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscoverData();
  }, [loadDiscoverData]);

  useEffect(() => {
    console.log('REACT STATE — mySkills:', mySkills);
  }, [mySkills]);
  const myTeachSkills = useMemo(
    () =>
      mySkills.filter(
        (skill) => normalizeSkillType(skill.skill_type) === 'teach',
      ),
    [mySkills],
  );

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();

    let results = partners.filter((person) => {
      const skills = [...person.teaches, ...person.wants];

      return (
        (!query ||
          person.name.toLowerCase().includes(query) ||
          person.title.toLowerCase().includes(query) ||
          person.location.toLowerCase().includes(query) ||
          skills.some((skill) => skill.toLowerCase().includes(query))) &&
        (selectedSkill === 'All skills' ||
          skills.some(
            (skill) => skill.toLowerCase() === selectedSkill.toLowerCase(),
          )) &&
        (level === 'All levels' || person.level === level) &&
        (availability === 'Any time' ||
          person.availability.toLowerCase() === availability.toLowerCase()) &&
        (!locationQuery ||
          person.location.toLowerCase().includes(locationQuery))
      );
    });

    if (sort === 'Best match') {
      results = [...results].sort((a, b) => b.match - a.match);
    } else if (sort === 'Highest rated') {
      results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'Most swaps') {
      results = [...results].sort((a, b) => (b.swaps || 0) - (a.swaps || 0));
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
    setError('');

    console.log('SEND REQUEST — myTeachSkills:', myTeachSkills);
    console.log('SEND REQUEST — count:', myTeachSkills.length);

    const currentTeachSkills = mySkills.filter(
      (skill) =>
        String(skill.skill_type || '')
          .trim()
          .toLowerCase() === 'teach',
    );

    console.log('CURRENT TEACHING SKILLS:', currentTeachSkills);

    if (!currentTeachSkills.length) {
      setFeedback(
        'No teaching skills are loaded yet. Refresh Discover and try again.',
      );
      return;
    }

    const existingRequest = requests.find(
      (request) =>
        String(getPartnerIdFromRequest(request)) === String(person.id) &&
        ['pending', 'accepted'].includes(
          String(request.status || '').toLowerCase(),
        ),
    );

    if (existingRequest) {
      setFeedback(
        `Your request to ${person.name} is already ${existingRequest.status}.`,
      );
      return;
    }

    if (!person.teaches.length) {
      setFeedback(`${person.name} has no teaching skills available yet.`);
      return;
    }

    const offeredSkill = currentTeachSkills[0];
    const wantedSkillName = person.teaches[0];
    const wantedSkillId = person.teachSkillIds[wantedSkillName.toLowerCase()];

    if (!offeredSkill?.id || !wantedSkillId) {
      setFeedback(
        'Could not identify the database skill IDs. Refresh Discover and try again.',
      );
      return;
    }

    setSendingTo(String(person.id));

    try {
      await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          offered_skill_id: offeredSkill.id,
          wanted_skill_id: wantedSkillId,
          message: `Hello ${person.name}, I can teach you ${offeredSkill.skill_name} and would like to learn ${wantedSkillName} from you. Would you like to exchange skills?`,
        }),
      });

      setFeedback(`Your request to ${person.name} was sent successfully.`);

      // Reload request statuses from PostgreSQL after creating the request.
      const result = await apiRequest('/requests?direction=sent');
      setRequests(getRequestsFromResponse(result));
    } catch (requestError) {
      setError(requestError.message || 'Could not send the request.');
    } finally {
      setSendingTo('');
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
            <button type="button" onClick={() => setSearch(search.trim())}>
              Search
            </button>
          </div>
        </section>

        <section className="discover-content">
          <div className="popular-skills">
            <h2>Popular skills</h2>
            <div className="skill-chips">
              {POPULAR_SKILLS.map((skill) => (
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
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Evenings</option>
                <option>Flexible</option>
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
                      ? 'Loading partners...'
                      : `${filteredPartners.length} ${filteredPartners.length === 1 ? 'partner' : 'partners'} found`}
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

              {error && (
                <div className="discover-feedback" role="alert">
                  {error}
                  <button type="button" onClick={loadDiscoverData}>
                    Try again
                  </button>
                </div>
              )}

              {feedback && (
                <p className="discover-feedback" role="status">
                  {feedback}
                </p>
              )}

              {loading ? (
                <div className="discover-empty">
                  <h3>Loading skill partners...</h3>
                  <p>Please wait while we load the latest skills.</p>
                </div>
              ) : filteredPartners.length ? (
                <div className="partner-grid">
                  {filteredPartners.map((person) => {
                    const status = getRequestStatus(requests, person.id);

                    return (
                      <article className="partner-card" key={person.id}>
                        <div className="partner-card-top">
                          <div className={`partner-avatar ${person.color}`}>
                            {person.profilePicture ? (
                              <img
                                src={person.profilePicture}
                                alt={`${person.name}'s profile`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '50%',
                                }}
                              />
                            ) : (
                              person.initials
                            )}
                          </div>

                          <div className="partner-match">
                            <strong>{person.match}%</strong>
                            <span>skill match</span>
                          </div>
                        </div>

                        <h3>{person.name}</h3>
                        <p className="partner-location">
                          <span aria-hidden="true">⌖</span> {person.location}
                        </p>
                        <p>{person.title}</p>

                        <div className="partner-stats">
                          <span>Rating not available</span>
                          <span>Swap history not available</span>
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
                          to={`/profile/${person.id}`}
                        >
                          View profile <span aria-hidden="true">→</span>
                        </Link>

                        <button
                          type="button"
                          className="partner-request-button"
                          disabled={
                            sendingTo === String(person.id) ||
                            status === 'pending' ||
                            status === 'accepted'
                          }
                          onClick={() => sendRequest(person)}
                        >
                          {sendingTo === String(person.id)
                            ? 'Sending request...'
                            : status === 'accepted'
                              ? 'Request accepted'
                              : status === 'pending'
                                ? 'Request pending'
                                : 'Send skill-swap request'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="discover-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>No skill partners found</h3>
                  <p>
                    {partners.length === 0
                      ? 'No other members have added discoverable skills yet.'
                      : 'Try another search or clear some filters.'}
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
