## Tổng quan

Ứng dụng Next.js (TypeScript, Chakra UI, Recoil)
## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000` để xem giao diện.

## Kiến trúc và chức năng từng file

### Gốc dự án
- `next-env.d.ts`: Khai báo type hỗ trợ Next.js cho TypeScript.
- `next.config.js`: Cấu hình Next.js (images, env, v.v.).
- `package.json`: Thông tin gói, scripts (`dev`, `build`, `start`), dependencies.
- `package-lock.json`: Khóa phiên bản dependencies.
- `tsconfig.json`: Cấu hình TypeScript.
- `README.md`: Tài liệu dự án (file này).
- `public/`:
  - `favicon.ico`, `vercel.svg`: Tài nguyên tĩnh.
  - `images/`: Ảnh sử dụng trong UI (`googlelogo.png`, `redditFace.svg`, ...).

### `src/styles`
- `globals.css`: CSS global áp dụng toàn ứng dụng.

### `src/types`
- `forum.ts`: Khai báo interface mô phỏng schema forum/blog/groups
### `src/chakra`
- `theme.ts`: Khởi tạo chủ đề Chakra UI (màu sắc, fonts, components).
- `button.ts`: Override style cho component Button của Chakra.
- `input.ts`: Override style cho component Input của Chakra.

### `src/atoms` (Recoil state)
- `authModalAtom.ts`: Trạng thái mở/đóng modal đăng nhập/đăng ký và tab hiện tại.
- `communitiesAtom.ts`: Trạng thái communities, snippet của người dùng, tham gia/rời cộng đồng.
- `directoryMenuAtom.ts`: Trạng thái menu Directory trên Navbar (mở/đóng, mục đã chọn).
- `notificationsAtom.ts`: Danh sách thông báo, số lượng chưa đọc, trạng thái tải.
- `postsAtom.ts`: Danh sách bài viết, bài đã chọn, cache bài viết, votes.
- `userAtom.ts`: Thông tin user hiện tại ở frontend (stub, không có backend).

### `src/helpers`
- `timestampHelpers.ts`: Chuẩn hóa và format thời gian (time-ago, hiển thị ngày/giờ).
- `userHelpers.ts`: Hàm tiện ích xử lý dữ liệu người dùng (ví dụ build display name).

### `src/hooks`
- `useAuth.ts`: Hook xác định trạng thái người dùng. Hiện stub (user = null), set cookie rỗng, đồng bộ `userAtom` về null.
- `useClientSide.ts`: Phát hiện đang chạy phía client để tránh lỗi SSR.
- `useCommunityData.ts`: Quản lý state cộng đồng (tham gia/rời) bằng cập nhật cục bộ; chỗ gọi backend đã gỡ.
- `useCommunityPermissions.ts`: Tính quyền user trong cộng đồng (owner/mod/member) theo state có sẵn.
- `useDirectory.ts`: Điều khiển mở/đóng Directory và chọn mục từ Navbar.
- `useNotifications.ts`: Trạng thái thông báo. 
- `usePinnedPosts.ts`: Trả về danh sách bài ghim (hiện rỗng, chờ tích hợp backend sau).
- `usePosts.ts`: Quản lý logic bài viết (thêm/sửa/xóa/ghim) ở phía client, đồng bộ với `postsAtom`.
- `useSelectFile.ts`: Xử lý chọn và preview ảnh khi đăng bài.

### `src/components/Layout`
- `ClientOnlyWrapper.tsx`: Chỉ render con khi chạy bên client để tránh mismatch SSR.
- `index.tsx`: Khung layout chính (Navbar, nội dung, sidebar khi cần).
- `InputField.tsx`, `InputItem.tsx`: Trường nhập liệu dựng sẵn dùng cho form.
- `PageContent.tsx`: Bố cục 2 cột linh hoạt (nội dung chính + phụ/ sidebar).
- `Sidebar.tsx`: Vùng sidebar dùng trong các trang chi tiết.

### `src/components/Navbar`
- `index.tsx`: Navbar chính (logo, search, directory, user area).
- `SearchInput.tsx`: Ô tìm kiếm ở Navbar.
- `RightContent/`
  - `index.tsx`: Vùng phải của Navbar (auth buttons / menu người dùng).
  - `AuthButtons.tsx`: Nút Đăng nhập/Đăng ký (mở modal auth).
  - `ActionIcon.tsx`: Icon action chung (message, notifications...).
  - `Icons.tsx`: Tập hợp các icon dùng trong Navbar RightContent.
  - `ProfileMenu/`
    - `MenuWrapper.tsx`: Dropdown menu người dùng (đăng xuất, profile...).
    - `NoUserList.tsx`: Danh sách menu khi chưa đăng nhập.
    - `UserList.tsx`: Danh sách menu khi đã đăng nhập (hiện hoạt động ở chế độ stub, không có Firebase).
- `Directory/`
  - `index.tsx`: Dropdown Directory tổng hợp mục.
  - `Communities.tsx`: Danh sách cộng đồng.
  - `Moderating.tsx`: Mục cộng đồng đang moderating.
  - `MyCommunities.tsx`: Cộng đồng đã tham gia.
  - `MenuListItem.tsx`: Item tiêu chuẩn trong menu Directory.

### `src/components/Notifications`
- `NotificationDropdown.tsx`: Dropdown hiển thị thông báo.
- `NotificationItem.tsx`: Một item thông báo.

### `src/components/Community`
- `Header.tsx`: Header của trang cộng đồng (ảnh, tên, join button).
- `JoinButton.tsx`: Nút tham gia/rời cộng đồng (cập nhật state cục bộ).
- `CommunityInfo.tsx`: Thông tin tổng quan cộng đồng (mô tả, số liệu).
- `CommunityManagement.tsx`: Khu vực quản trị cộng đồng (chỉnh sửa thông tin). 
- `CommunityRules.tsx`: Hiển thị nội quy cộng đồng.
- `CommunityHighlights.tsx`: Khối highlight/giới thiệu nhanh.
- `Recommendations.tsx`: Gợi ý cộng đồng khác (placeholder, không gọi backend).
- `About.tsx`: Box “About Community”.
- `CommunityNotFound.tsx`: Hiển thị khi cộng đồng không tồn tại.
- `Temp.tsx`: Thành phần tạm thời/phụ trợ UI.

### `src/components/Post`
- `Posts.tsx`: Danh sách bài viết cho trang/community; hiện render từ `postsAtom` (mặc định rỗng).
- `PostsHome.tsx`: Wrapper danh sách bài viết cho trang Home.
- `PostItem/index.tsx`: Hiển thị 1 bài viết; hỗ trợ vote/pin/delete dạng stub và cập nhật UI lạc quan.
- `PostModeration.tsx`: Hành động moderation (pin/unpin, ban) dạng UI stub.
- `Loader.tsx`: Skeleton/loader cho danh sách bài viết.
- `PostForm/`
  - `NewPostForm.tsx`: Form tạo bài viết (tab text/link/image), quản lý state cục bộ.
  - `TextInputs.tsx`: Trường nhập tiêu đề/nội dung.
  - `ImageUpload.tsx`: Chọn và preview ảnh.
  - `TabItem.tsx`: Tab selector cho form post.
- `Comments/`
  - `index.tsx`: Quản lý danh sách bình luận theo post; thêm/sửa/xóa/reply trong state cục bộ; tạo id tạm `Date.now()`; không gọi backend.
  - `CommentItem.tsx`: Hiển thị 1 bình luận, hỗ trợ like (UI), reply lồng nhau, highlight theo hash URL.
  - `Input.tsx`: Ô nhập bình luận mới.
  - `ReplyInput.tsx`: Ô nhập trả lời một bình luận.

### `src/components/Main`
- `index.tsx`: Thành phần trang chính tổng hợp khối UI.

### `src/components/Modal`
- `ModalWrapper.tsx`: Khung modal dùng chung.
- `CreateCommunity/index.tsx`: Modal tạo cộng đồng (UI; cập nhật cục bộ, chưa lưu backend).
- `Auth/`
  - `index.tsx`: Modal xác thực (điều hướng giữa login/signup/reset).
  - `Inputs.tsx`: Input chung cho form auth.
  - `Login.tsx`: Form đăng nhập 
  - `SignUp.tsx`: Form đăng ký 
  - `OAuthButtons.tsx`: Nút OAuth (UI, chưa tích hợp nhà cung cấp).
  - `ResetPassword.tsx`: Form reset mật khẩu 

### `src/components/PersonalHome`
- `index.tsx`: Khối “Personal Home” bên sidebar trang chủ.

### `src/pages`
- `_app.tsx`: Entry của Next.js; bọc ChakraProvider, RecoilRoot, theme,...
- `_document.tsx`: Tùy biến Document (lang, fonts, SSR style tag).
- `index.tsx`: Trang Home; hiển thị feed bài viết (rỗng nếu không có mock).
- `popular.tsx`: Trang “Popular” 
- `profile.tsx`: Trang hồ sơ người dùng (UI, dữ liệu stub).
- `r/[community]/index.tsx`: Trang chi tiết community (header, about, posts...).
- `r/[community]/submit.tsx`: Trang tạo bài trong community.
- `r/[community]/comments/[pid].tsx`: Trang chi tiết bài viết + bình luận.


