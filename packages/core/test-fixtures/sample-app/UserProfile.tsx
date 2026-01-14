import React, {useState, useContext} from "react";
import {UserContext, ThemeContext} from "./App";

interface UserProfileProps {
  user: {name: string} | null;
  setUser: (user: {name: string} | null) => void;
}

export function UserProfile({user, setUser}: UserProfileProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const theme = useContext(ThemeContext);
  const contextUser = useContext(UserContext);

  const handleSave = () => {
    setUser({name});
    setEditing(false);
  };

  return (
    <div className={`user-profile user-profile--${theme}`}>
      {editing ? (
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={handleSave}>Save</button>
        </div>
      ) : (
        <div>
          <p>User: {user?.name || contextUser?.name || "Guest"}</p>
          <button onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}
