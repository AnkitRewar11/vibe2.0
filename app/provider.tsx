'use client';

import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { UserDetailContext } from '@/context/UserDetailContext';
import { set } from 'date-fns';
import { OnSaveContext } from '@/context/OnSaveContex';

export default function Provider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    const { user } = useUser();
    const [userData, setUserDetail] = useState<any>();
    const [onSaveData,setOnSaveData]=useState<any>(null);
    useEffect(() => {
        user && CreateNewUser();
    }, [user]);

    const CreateNewUser = async () => {

        const result = await axios.post('/api/users', {
        });
        console.log(result.data);
        setUserDetail(result.data?.user);
    };

    return (
        <div>
            <UserDetailContext.Provider value={{ userData, setUserDetail }}>
                <OnSaveContext.Provider value={{onSaveData,setOnSaveData}}>
                    {children}
                </OnSaveContext.Provider>
            </UserDetailContext.Provider>
        </div>
    )
}
