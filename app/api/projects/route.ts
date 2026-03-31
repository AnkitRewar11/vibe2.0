export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { chatTable, projectTable, usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { frameTable } from "@/config/schema";



export async function POST(req: NextRequest){
    const {projectId,frameId,messages} = await req.json();
    console.log('MESSAGES:', JSON.stringify(messages)); // ← YE ADD KARO
    console.log('NAME:', messages[0]?.content);   
    
    const user = await currentUser();

    // create project
    const projectResult = await db.insert(projectTable).values({
        projectId: projectId,
        createdBy: user?.primaryEmailAddress?.emailAddress,
        name: messages[0]?.content ?? 'Untitled Project',

    });

    // create frame
    const frameResult = await db.insert(frameTable).values({
        frameId: frameId,
        projectId: projectId,
    });

    // save user messages
    const chatResults = await db.insert(chatTable).values({
        chatMessage: messages,
        createdBy: user?.primaryEmailAddress?.emailAddress,
        frameId:frameId,
    });

     

    return NextResponse.json({
        projectId,frameId,messages

    });


}