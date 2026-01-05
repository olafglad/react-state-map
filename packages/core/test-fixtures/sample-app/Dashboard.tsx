// Component using Zustand, Redux, and custom hooks
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuthStore } from './stores/useAuthStore';
import { useAuth } from './hooks/useAuth';

interface RootState {
  counter: { value: number };
  todos: { items: string[] };
}

export function Dashboard() {
  // Redux
  const counter = useSelector((state: RootState) => state.counter.value);
  const todos = useSelector((state: RootState) => state.todos.items);
  const dispatch = useDispatch();

  // Zustand
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  // Custom hook
  const auth = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Counter: {counter}</p>
      <p>Todos: {todos.length}</p>
      <p>User: {user?.name}</p>
      <p>Auth status: {isAuthenticated ? 'Yes' : 'No'}</p>
      <p>Auth hook user: {auth.user?.name}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
