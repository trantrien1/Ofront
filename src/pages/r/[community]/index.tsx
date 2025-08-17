import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { GetServerSidePropsContext, NextPage } from "next";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState } from "recoil";
import safeJsonStringify from "safe-json-stringify";
import { Community, communityState } from "../../../atoms/communitiesAtom";
import CommunityNotFound from "../../../components/Community/CommunityNotFound";
import CommunityInfo from "../../../components/Community/CommunityInfo";
import Header from "../../../components/Community/Header";
import CommunityRules from "../../../components/Community/CommunityRules";
import CommunityHighlights from "../../../components/Community/CommunityHighlights";
import PageContentLayout from "../../../components/Layout/PageContent";
import Posts from "../../../components/Post/Posts";
import { usePinnedPosts } from "../../../hooks/usePinnedPosts";
import { auth, firestore } from "../../../firebase/clientApp";

interface CommunityPageProps {
  communityData: Community;
}

const CommunityPage: NextPage<CommunityPageProps> = ({ communityData }) => {
  const [user, loadingUser] = useAuthState(auth);

  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  const { pinnedPosts, loading: loadingPinnedPosts } = usePinnedPosts(
    communityData.pinnedPosts || []
  );

  // useEffect(() => {
  //   // First time the user has navigated to this community page during session - add to cache
  //   const firstSessionVisit =
  //     !communityStateValue.visitedCommunities[communityData.id!];

  //   if (firstSessionVisit) {
  //     setCommunityStateValue((prev) => ({
  //       ...prev,
  //       visitedCommunities: {
  //         ...prev.visitedCommunities,
  //         [communityData.id!]: communityData,
  //       },
  //     }));
  //   }
  // }, [communityData]);

  useEffect(() => {
    setCommunityStateValue((prev) => ({
      ...prev,
      currentCommunity: communityData,
    }));
  }, [communityData]);

  // Community was not found in the database
  if (!communityData) {
    return <CommunityNotFound />;
  }

  return (
    <>
      <Header communityData={communityData} />
      <PageContentLayout>
        {/* Left Content */}
        <>
          <CommunityHighlights 
            pinnedPosts={pinnedPosts}
            communityData={communityData}
          />
          <Posts
            communityData={communityData}
            userId={user?.uid}
            loadingUser={loadingUser}
          />
        </>
        {/* Right Content */}
        <>
          <CommunityInfo communityData={communityData} />
          <CommunityRules communityData={communityData} />
        </>
      </PageContentLayout>
    </>
  );
};

export default CommunityPage;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  console.log("GET SERVER SIDE PROPS RUNNING");

  try {
    const communityDocRef = doc(
      firestore,
      "communities",
      context.query.community as string
    );
    const communityDoc = await getDoc(communityDocRef);
    return {
      props: {
        communityData: communityDoc.exists()
          ? JSON.parse(
              safeJsonStringify({ id: communityDoc.id, ...communityDoc.data() }) // needed for dates
            )
          : "",
      },
    };
  } catch (error) {
    // Could create error page here
    console.log("getServerSideProps error - [community]", error);
    return {
      props: {
        communityData: "",
      },
    };
  }
}
