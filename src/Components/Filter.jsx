import React from 'react';
import '../App.css'; 


const Filter = ({ filters = [], activeFilter, onFilterChange }) => {

    const defaultFilters = [
        { id: 'recent', label: 'Recent' },
        { id: 'popular', label: 'Popular' }
    ];

    const displayFilters = filters.length > 0 ? filters : defaultFilters;

    const handleFilterChange = (filterId) => {
        if (onFilterChange) {
            onFilterChange(filterId);
        }
    };

    // Basic validation or handling if no filters/handler provided
    if (displayFilters.length === 0 || !onFilterChange) {
        // Optionally return null or a placeholder if the component can't function
        // console.warn("Filter component requires 'filters' array and 'onFilterChange' handler.");
        // return null;
    }

    return (
        <div className="filter">
            {displayFilters.map(filter => (
                <button
                    key={filter.id}
                    className={activeFilter === filter.id ? 'active' : ''}
                    onClick={() => handleFilterChange(filter.id)}
                    aria-pressed={activeFilter === filter.id}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
};

export default Filter;
