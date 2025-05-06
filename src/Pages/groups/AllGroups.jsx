import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Groups.css'; 

const GroupCard = ({ group }) => {
    const navigate = useNavigate();
    // Add join functionality later 
    return (
        <div className="group-card">
            <h4>{group.name}</h4>
            {group.description && <p>{group.description}</p>}
            {/* Add member count if fetched: <p>Members: {group.member_count || 0}</p> */}
            <div className="group-card-actions">
                 <button onClick={() => navigate(`/group/${group.id}`)} className="view-button">View</button>
                 {/* Add Join Button Here - Requires knowing user membership status */}
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

    useEffect(() => {
        const fetchAllGroups = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all groups - add search/filter later 
                const { data, error: fetchError } = await supabase
                    .from('study_groups')
                    .select('id, name, description, created_at') 
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;
                setGroups(data || []);
            } catch (err) {
                console.error("Error fetching all groups:", err);
                setError("Failed to load groups.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllGroups();
    }, []);

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="all-groups-page">
            <div className="all-groups-header">
                <h2>All Study Groups</h2>
                <button onClick={() => navigate('/create-group')} className="create-group-link-button">
                    Create New Group
                </button>
            </div>

             <div className="group-search-container">
                 <input
                     type="text"
                     placeholder="Search groups..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="group-search-input"
                 />
             </div>

            {loading ? (
                <div className="loading">Loading groups...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <div className="groups-grid">
                    {filteredGroups.length > 0 ? (
                        filteredGroups.map(group => (
                            <GroupCard key={group.id} group={group} />
                        ))
                    ) : (
                        <p>No groups found matching your search.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllGroups;