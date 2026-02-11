'use client';
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        let mounted = true;

        async function getUserDetails(sessionUser) {
            if (!sessionUser?.email) return null;

            try {
                const { data: dbUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', sessionUser.email)
                    .single();

                if (error) {
                    // PGRST116 is "Row not found" - this is expected for new users not yet synced
                    if (error.code !== 'PGRST116') {
                        console.warn("Error fetching user details:", error.message);
                    }
                    return sessionUser;
                }
                return { ...sessionUser, ...dbUser };
            } catch (err) {
                console.warn("Exception fetching user details:", err);
                return sessionUser;
            }
        }

        const initUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (mounted) {
                    if (session?.user) {
                        const fullUser = await getUserDetails(session.user);
                        if (mounted) setUser(fullUser);
                    } else {
                        setUser(null);
                    }
                    setIsLoading(false);
                }
            } catch (e) {
                if (mounted) setIsLoading(false);
            }
        }

        initUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (session?.user) {
                // Optimistically set session user while fetching details
                // setUser(prev => prev?.email === session.user.email ? prev : session.user); 
                // But better to fetch details
                const fullUser = await getUserDetails(session.user);
                if (mounted) setUser(fullUser);
            } else {
                setUser(null)
            }
            setIsLoading(false)
        })

        return () => {
            mounted = false;
            subscription.unsubscribe()
        }
    }, [])

    return { user, isLoading, signOut: () => supabase.auth.signOut() }
}
