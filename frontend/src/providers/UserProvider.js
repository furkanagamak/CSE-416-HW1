import React, { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext(null);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUserContext not used within the approriate provider");

  return context;
};

export const UserContextProvider = ({ children }) => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/get-or-assign-name", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched username:", data.username);
        setUsername(data.username);
      })
      .catch((error) => console.error("Error:", error));
  }, []);

  if (!username) return <div>Loading username ...</div>;

  return (
    <UserContext.Provider value={username}>{children}</UserContext.Provider>
  );
};
