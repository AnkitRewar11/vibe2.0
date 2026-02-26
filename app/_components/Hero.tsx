'use client'
import React, { useContext, useState } from "react";
import { Button } from "../../components/ui/button";
import { ArrowUp, ImagePlus, LayoutDashboard, Key, Home, User as UserIcon, Loader2Icon } from "lucide-react";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { set } from "date-fns";
import { UserDetailContext } from "@/context/UserDetailContext";
import { eq } from "drizzle-orm";


const suggestion = [
  {
    label: "Dashboard",
    prompt: "Create an analytics dashboard to track customers and revenue data for a Saas",
    icon: LayoutDashboard
  },
  {
    label: "SignUp Form",
    prompt: "Create a modern sign up form with email/password fields, Google and Github login options, and terms checkbox",
    icon: Key
  },
  {
    label: "Hero",
    prompt: "Create a modern header and centered hero section for a productivity Saas. Include a badge for feature announcement, a title with a subtle gradient effect, subtitle, CTA, small social proof and an image.",
    icon: Home
  },
  {
    label: "User Profile Card",
    prompt: "Create a modern user profile card component for a social media website",
    icon: UserIcon
  }
];

function Hero() {
  const [userInput, setUserInput] = useState<string>(''); // init as empty string
  const { isSignedIn } = useUser(); // Clerk hook
  const router = useRouter();
  const [loading, setLoading] = useState(false);


  const CreateNewProject = async () => {

    setLoading(true);
    const projectId = uuidv4();
    const frameId = generateRandomFrameNumber();
    const messages = [
      {
        role: 'user',
        content: userInput
      }
    ]
    try {
      const result = await axios.post('/api/projects', {
        projectId: projectId,
        frameId: frameId,
        messages: messages,
      });

      console.log(result.data);
      toast.success('Project Created Successfully!');

      // Navigate to playground
      router.push(`/playground/${projectId}?frameId=${frameId}&prompt=${encodeURIComponent(userInput)}`);
      setLoading(false);

    } catch (e) {
      toast.error('Internal Server Error!'); 
      console.log(e);
      setLoading(false);

    }


  };

  const handleSubmit = async () => {
    if (!userInput.trim()) return; // guard
    // Example: POST to your API to generate design
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      // handle success (navigate to workspace, show toast, etc.)
      console.log('generated', data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center h-[80vh] justify-center gap-6">
      <h2 className="font-bold text-6xl">What Should We Design?</h2>
      <p className="mt-2 text-xl text-gray-500">Generate, Edit and Explore design with AI, Export as Well</p>

      <div className="w-full max-w-2xl p-5 border mt-5 rounded-2xl">
        <textarea
          aria-label="Describe your page design idea"
          placeholder="Describe your Page design idea..."
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          className="w-full h-24 focus:outline-none focus:ring-0 resize-none"
        />

        <div className="flex justify-between items-center mt-3">
          <Button variant="ghost" onClick={() => setUserInput('')}>
            <ImagePlus />
          </Button>

          {/* If user is signed in -> show submit button that calls handleSubmit
              If not signed in -> wrap button with SignInButton (modal) so clicking prompts sign-in.
              Also disable when input empty. */}
          {!isSignedIn ? (
            <SignInButton mode="modal" forceRedirectUrl="/workspace">
              <Button disabled={!userInput.trim()}>
                <ArrowUp />
              </Button>
            </SignInButton>
          ) : (
            <Button onClick={CreateNewProject} disabled={!userInput || loading}>
             { loading? <Loader2Icon className="animate-spin" /> : <ArrowUp />}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {suggestion.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="outline"
              onClick={() => setUserInput(item.prompt)}
            >
              <Icon className="mr-2" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default Hero;

const generateRandomFrameNumber = () => {
  const num = Math.floor(Math.random() * 10000);
  return num;
};