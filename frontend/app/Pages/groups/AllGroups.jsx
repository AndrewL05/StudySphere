import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Groups.css';

const GroupCard = ({ group }) => {
    const navigate = useNavigate();
    const memberCount = group.group_members?.[0]?.count ?? 0;

    return (
        <div className="group-card" onClick={() => navigate(`/group/${group.id}`)}>
            <h4 className="group-card-name">{group.name}</h4>
            {group.topics && group.topics.length > 0 && (
                <div className="group-card-topics">
                    {group.topics.map(topic => <span key={topic} className="topic-tag">{topic}</span>)}
                </div>
            )}
            {group.description && <p className="group-card-desc">{group.description}</p>}
            <p className="group-card-members">{memberCount} members</p>
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
        <div className="groups-page">
            <div className="groups-container">
                <div className="groups-page-header">
                    <h2 className="groups-page-title">All Groups</h2>
                    <button onClick={() => navigate('/create-group')} className="form-submit-btn">Create Group</button>
                </div>

                <div className="groups-filter-bar">
                    <input
                        type="text"
                        placeholder="Search groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="groups-search-input"
                    />
                    <div className="groups-topic-filters">
                        {availableTopics.map(topic => (
                            <button
                                key={topic}
                                className={`topic-filter-btn ${selectedTopics.includes(topic) ? 'active' : ''}`}
                                onClick={() => handleTopicChange(topic)}
                            >
                                {topic}
                            </button>
                        ))}
                        {selectedTopics.length > 0 && (
                            <button onClick={() => setSelectedTopics([])} className="topic-filter-clear">Clear</button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="feed-loading"><div className="loading-spinner"></div><p>Loading groups...</p></div>
                ) : error ? (
                    <div className="feed-empty"><p>{error}</p></div>
                ) : groups.length > 0 ? (
                    <div className="groups-grid">
                        {groups.map(group => <GroupCard key={group.id} group={group} />)}
                    </div>
                ) : (
                    <div className="feed-empty"><p>No groups found.</p></div>
                )}
            </div>
        </div>
    );
};

export default AllGroups;
