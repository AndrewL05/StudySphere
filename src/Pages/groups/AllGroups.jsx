import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Groups.css';

const GroupCard = ({ group }) => {
    const navigate = useNavigate();
    const memberCount = group.group_members?.[0]?.count ?? 0;

    return (
        <div className="group-card" onClick={() => navigate(`/group/${group.id}`)}>
            <h4>{group.name}</h4>

            {group.topics && group.topics.length > 0 && (
                <div className="group-card-topics">
                    {group.topics.map(topic => <span key={topic} className="topic-tag">{topic}</span>)}
                </div>
            )}
            {group.description && <p className="group-card-description">{group.description}</p>}

            <p className="group-card-members">Members: {memberCount}</p>

            <div className="group-card-actions">
                 <button onClick={(e) => { e.stopPropagation(); navigate(`/group/${group.id}`); }} className="view-button">View</button>
                 {/* Add Join Button Here later */}
            </div>
        </div>
    );
};


const AllGroups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [availableTopics, setAvailableTopics] = useState([
        'Math', 'Science', 'History', 'Programming', 'Physics', 'Calculus', 'Biology', 'Chemistry', 'Literature', 'Art'
    ]);
    const [selectedTopics, setSelectedTopics] = useState([]);

    const fetchAllGroups = useCallback(async () => {
        setLoading(true);
        setError(null);
        console.log("Fetching groups with searchTerm:", searchTerm, "selectedTopics:", selectedTopics);

        try {
            let queryBuilder = supabase
                .from('study_groups')
                .select('id, name, description, created_at, topics, group_members(count)');

            if (searchTerm.trim()) {
                queryBuilder = queryBuilder.or(
                    `name.ilike.%${searchTerm.trim()}%,description.ilike.%${searchTerm.trim()}%`
                );
            }

            if (selectedTopics.length > 0) {
                queryBuilder = queryBuilder.contains('topics', selectedTopics);
            }

            queryBuilder = queryBuilder.order('created_at', { ascending: false });

            const { data, error: fetchError } = await queryBuilder;

            if (fetchError) throw fetchError;

            console.log("Fetched groups data:", data); 
            setGroups(data || []);

        } catch (err) {
            console.error("Error fetching all groups:", err);
            if (err.message.includes("relation") && err.message.includes("does not exist")) {
                 setError("Failed to load groups. Database relationship might be missing.");
            } else {
                 setError("Failed to load groups. Please try again.");
            }
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, selectedTopics]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchAllGroups();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [fetchAllGroups]);

    const handleTopicChange = (topic) => {
        setSelectedTopics(prev =>
            prev.includes(topic)
            ? prev.filter(t => t !== topic)
            : [...prev, topic]
        );
    };

    return (
        <div className="all-groups-page">
            <div className="all-groups-header">
                <h2>All Study Groups</h2>
                <button onClick={() => navigate('/create-group')} className="create-group-link-button">
                    Create New Group
                </button>
            </div>

             <div className="groups-filter-container">
                <div className="group-search-container">
                     <input
                         type="text"
                         placeholder="Search groups by name or description..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="group-search-input"
                     />
                </div>

                <div className="topic-filters">
                    <h4>Filter by Topic:</h4>
                    <div className="topic-checkboxes">
                        {availableTopics.map(topic => (
                            <label key={topic} className="topic-label">
                                <input
                                    type="checkbox"
                                    checked={selectedTopics.includes(topic)}
                                    onChange={() => handleTopicChange(topic)}
                                /> {topic}
                            </label>
                        ))}
                    </div>
                     {selectedTopics.length > 0 && (
                        <button
                            onClick={() => setSelectedTopics([])}
                            className="clear-topics-btn"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
             </div>


            {loading ? (
                <div className="loading">Loading groups...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : (
                <div className="groups-grid">
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <GroupCard key={group.id} group={group} />
                        ))
                    ) : (
                        <p className="no-groups-found">No groups found matching your criteria.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllGroups;
