'use client';
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const supabase = createClient()

    // Force refresh function that can be called externally
    const refreshUser = useCallback(() => {
        console.log('[useUser] Manual refresh triggered');
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        async function getUserDetails(sessionUser) {
            if (!sessionUser?.email || !mounted) return;

            try {
                const { data: dbUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', sessionUser.email)
                    .single();

                if (error) {
                    if (error.code !== 'PGRST116') {
                        console.warn(`[useUser] Note: Database profile fetch error:`, error.message);
                    }
                    return;
                }

                if (mounted && dbUser) {
                    console.log(`[useUser] Profile details loaded for ${sessionUser.email}, role: ${dbUser.role}`);

                    // Merge session user data with db profile data
                    setUser(prev => {
                        if (!prev) return { ...sessionUser, ...dbUser };
                        return { ...prev, ...dbUser };
                    });
                }
            } catch (err) {
                // Ignore background fetch errors
                if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                    console.warn(`[useUser] Background fetch exception:`, err);
                }
            }
        }

        const initUser = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        console.log(`[useUser] Session found: ${session.user.email}`);
                        setUser(session.user);
                        setIsLoading(false); // SET LOADING FALSE IMMEDIATELY
                        getUserDetails(session.user); // Fetch profile in background
                    } else {
                        setUser(null);
                        setIsLoading(false);
                    }
                }
            } catch (e) {
                if (e.name !== 'AbortError' && !e.message?.includes('aborted')) {
                    console.error('[useUser] Initialization error:', e);
                }
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        }

        initUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log(`[useUser] Auth state changed: ${event}`);

            if (event === 'SIGNED_OUT') {
                console.log('[useUser] User signed out, clearing state');
                setUser(null);
                setIsLoading(false);
                return;
            }

            if (session?.user) {
                // Determine if we should set or merge
                setUser(prev => {
                    // If it's the same user, just merge the session data into what we have
                    if (prev && prev.id === session.user.id) {
                        return { ...prev, ...session.user };
                    }
                    // If it's a new login or it was null, set the session user
                    return session.user;
                });
                setIsLoading(false);
                getUserDetails(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        })

        return () => {
            console.log('[useUser] Cleanup: unsubscribing');
            mounted = false;
            subscription.unsubscribe()
        }
    }, [refreshTrigger])

    const signOut = useCallback(async () => {
        console.log('[useUser] Signing out...');
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('[useUser] Sign out error:', error);
            } else {
                console.log('[useUser] Successfully signed out');
            }
            // Clear user state immediately
            setUser(null);
        } catch (err) {
            console.error('[useUser] Exception during sign out:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    return { user, isLoading, signOut, refreshUser }
}
