import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/?query=${encodeURIComponent(query)}`);
    }
  };
  
  return (
    <form onSubmit={handleSearch} className="relative">
      <input 
        type="text" 
        placeholder="Search music..." 
        className="w-full bg-background py-2 px-4 rounded-md pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </form>
  );
}
