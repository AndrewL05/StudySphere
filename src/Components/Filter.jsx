import React from 'react';
import '../App.css';

const Filter = ({ activeFilter = 'newest', onFilterChange }) => {
    const filters = [
        { id: 'newest', label: 'Newest' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'popular', label: 'Most Popular' }
    ];
    
    const handleFilterChange = (filterId) => {
        if (onFilterChange) {
            onFilterChange(filterId);
        }
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