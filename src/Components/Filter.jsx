import React, { useState } from 'react';
import '../App.css';

const Filter = () => {
    const [activeFilter, setActiveFilter] = useState('newest');
    
    const filters = [
        { id: 'newest', label: 'Newest' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'popular', label: 'Most Popular' },
        { id: 'unanswered', label: 'Unanswered' }
    ];
    
    const handleFilterChange = (filterId) => {
        setActiveFilter(filterId);
        // add logic
    };

    return (
        <div className="filter">
            <p>
                Order by: 
                {filters.map(filter => (
                    <button 
                        key={filter.id}
                        className={activeFilter === filter.id ? 'active' : ''}
                        onClick={() => handleFilterChange(filter.id)}
                    >
                        {filter.label}
                    </button>
                ))}
            </p>
        </div>
    );
};

export default Filter;