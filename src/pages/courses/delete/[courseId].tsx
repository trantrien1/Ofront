import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Box, Heading, Text, Spinner, useToast, Button } from "@chakra-ui/react";
import { CoursesService } from "../../../services";

export default function CourseDeletePage() {
  const router = useRouter();
  const toast = useToast();
  const { courseId } = router.query as { courseId?: string };
  const [status, setStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [debug, setDebug] = useState<any>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const run = async () => {
      setStatus("deleting");
      try {
        await CoursesService.deleteCourse(courseId);
        setStatus("done");
        toast({ status: "success", title: "Đã xóa khóa học" });
        router.replace("/courses");
      } catch (e: any) {
        const data = e?.response?.data;
        const msg = data?.message || data?.error || e?.message || "Xóa thất bại";
        setMessage(msg);
        if (data && data.error === 'upstream_failed') setDebug(data);
        if (e?.response?.headers) setHeaders(e.response.headers as any);
        setStatus("error");
      }
    };
    run();
  }, [courseId]);

  return (
    <Box maxW="640px" mx="auto" px={4} py={8} textAlign="center">
      <Heading size="md" mb={3}>Xóa khóa học</Heading>
      {status === "deleting" && (
        <Box><Spinner mr={2}/> <Text as="span">Đang xóa...</Text></Box>
      )}
      {status === "error" && (
        <Box>
          <Text mb={3}>Có lỗi xảy ra: {message}</Text>
          {debug ? (
            <Box textAlign="left" fontSize="sm" bg="gray.50" p={3} borderRadius="md" mb={3}>
              <Text><b>lastAttempt:</b> {debug?.lastAttempt}</Text>
              <Text><b>upstreamUrl:</b> {debug?.upstreamUrl}</Text>
              <Text><b>body:</b> {typeof debug?.body === 'string' ? debug.body : JSON.stringify(debug?.body)}</Text>
            </Box>
          ) : null}
          {headers ? (
            <Box textAlign="left" fontSize="sm" bg="gray.50" p={3} borderRadius="md" mb={3}>
              <Text><b>x-proxy-has-auth:</b> {(headers['x-proxy-has-auth'] as any) ?? '-'}</Text>
              <Text><b>x-proxy-attempt:</b> {(headers['x-proxy-attempt'] as any) ?? '-'}</Text>
              <Text><b>x-proxy-upstream:</b> {(headers['x-proxy-upstream'] as any) ?? '-'}</Text>
            </Box>
          ) : null}
          <Button onClick={() => router.push("/courses")} colorScheme="blue">Quay lại danh sách</Button>
        </Box>
      )}
    </Box>
  );
}
