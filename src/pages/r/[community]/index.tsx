import { useEffect } from "react";
// Firebase removed
import type { GetServerSidePropsContext, NextPage } from "next";
// Firebase removed
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
// Firebase removed

interface CommunityPageProps {
  communityData: Community;
}

const CommunityPage: NextPage<CommunityPageProps> = ({ communityData }) => {
  const user = null as any; const loadingUser = false;

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
    // TODO: Fetch community by slug from API/DB
    return {
      props: {
        communityData: "",
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
