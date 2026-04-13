import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function Index() {
  const { isAuthenticated } = useAuth();

  return <Redirect href={(isAuthenticated ? "/calendars" : "/login") as any} />;
}
