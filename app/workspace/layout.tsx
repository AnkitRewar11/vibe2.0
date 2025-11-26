import React from 'react'
import layout from '../layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './_components/AppSidebar';
import AppHeader from './_components/AppHeader';


function Workspacelayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className='w-full'>
                <AppHeader />
                {children}
            </div>
        </SidebarProvider>

        
    )
}

export default Workspacelayout;
