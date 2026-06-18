package renderer

import (
	"fmt"
	"strings"

	"github.com/kreasinusantara/ui-generator-backend/internal/designsystem"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// GenerateKitTSX renders the page for the selected theme/design system.
//
//   - Visual design systems (shadcn, neobrutalism, doodle, glass, soft, …) are
//     token-driven: they share ONE renderer fed by the design-system token map,
//     the SAME tokens the studio preview uses — so exported code matches what the
//     user saw, and switching style visibly changes the output.
//   - Component-library kits (antd, mui, chakra, reui) emit idiomatic code from
//     their own packages.
//
// `library` is the resolved theme identifier (it equals the design-system slug
// for the visual styles).
func GenerateKitTSX(page schema.PageSchema, library string) string {
	lib := strings.ToLower(strings.TrimSpace(library))
	switch lib {
	case "antd", "ant", "ant-design":
		return generateAntd(page)
	case "mui", "material", "material-ui":
		return generateMui(page)
	case "chakra", "chakra-ui":
		return generateChakra(page)
	case "reui":
		return "// ReUI kit (Tailwind + Radix). Components import from \"@/components/reui/*\".\n\n" + GenerateTSX(page)
	}
	if designsystem.Has(lib) {
		ds := designsystem.Get(lib)
		return fmt.Sprintf("// %s design system — token-driven, matches the studio preview.\n\n", ds.Name) + generateTokenTSX(page, ds)
	}
	return "// shadcn/ui kit (Tailwind + Radix). Components import from \"@/components/ui/*\".\n\n" + GenerateTSX(page)
}

func generateAntd(page schema.PageSchema) string {
	var b strings.Builder
	b.WriteString("\"use client\";\n\n")
	b.WriteString("import { Card, Col, Row, Statistic, Table, Tag, Typography } from \"antd\";\n\n")
	b.WriteString("const { Title, Text } = Typography;\n\n")
	b.WriteString(fmt.Sprintf("export default function %s() {\n", componentName(page)))
	b.WriteString("  return (\n")
	b.WriteString("    <div style={{ padding: 24, background: \"#f5f5f5\", minHeight: \"100vh\" }}>\n")
	b.WriteString(fmt.Sprintf("      <Title level={3}>%s</Title>\n", escape(page.Title)))
	b.WriteString(fmt.Sprintf("      <Text type=\"secondary\">%s dashboard generated from a validated schema.</Text>\n", title(page.Domain)))
	b.WriteString("      <div style={{ marginTop: 24, display: \"flex\", flexDirection: \"column\", gap: 16 }}>\n")
	for _, s := range page.Sections {
		switch s.Type {
		case "statsGrid":
			b.WriteString("        <Row gutter={[16, 16]}>\n")
			for _, item := range s.Items {
				b.WriteString("          <Col xs={24} sm={12} md={6}>\n")
				b.WriteString("            <Card size=\"small\">\n")
				b.WriteString(fmt.Sprintf("              <Statistic title=\"%s\" value=\"%s\" />\n", escape(item.Label), escape(item.Value)))
				b.WriteString("            </Card>\n          </Col>\n")
			}
			b.WriteString("        </Row>\n")
		case "dataTable":
			b.WriteString(fmt.Sprintf("        <Card title=\"%s\">\n", escape(s.Title)))
			b.WriteString("          <Table pagination={false} size=\"middle\"\n")
			b.WriteString("            columns={[")
			for _, c := range s.Columns {
				b.WriteString(fmt.Sprintf("{ title: \"%s\", dataIndex: \"%s\" }, ", escape(c), escape(strings.ToLower(c))))
			}
			b.WriteString("]}\n")
			b.WriteString("            dataSource={[]} />\n")
			b.WriteString("        </Card>\n")
		case "chartPanel":
			b.WriteString(fmt.Sprintf("        <Card title=\"%s\">\n", escape(s.Title)))
			b.WriteString("          <div style={{ height: 220, background: \"linear-gradient(180deg,#e6f4ff,#fff)\", borderRadius: 8 }} />\n")
			b.WriteString("        </Card>\n")
		default:
			b.WriteString(fmt.Sprintf("        <Card title=\"%s\">\n", escape(sectionTitle(s))))
			b.WriteString(fmt.Sprintf("          <Text type=\"secondary\">%s section</Text>\n", escape(s.Type)))
			b.WriteString("        </Card>\n")
		}
	}
	b.WriteString("      </div>\n    </div>\n  );\n}\n")
	return b.String()
}

func generateMui(page schema.PageSchema) string {
	var b strings.Builder
	b.WriteString("\"use client\";\n\n")
	b.WriteString("import { Box, Card, CardContent, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from \"@mui/material\";\n\n")
	b.WriteString(fmt.Sprintf("export default function %s() {\n", componentName(page)))
	b.WriteString("  return (\n")
	b.WriteString("    <Box sx={{ p: 3, bgcolor: \"grey.50\", minHeight: \"100vh\" }}>\n")
	b.WriteString(fmt.Sprintf("      <Typography variant=\"h5\" fontWeight={700}>%s</Typography>\n", escape(page.Title)))
	b.WriteString(fmt.Sprintf("      <Typography variant=\"body2\" color=\"text.secondary\">%s dashboard generated from a validated schema.</Typography>\n", title(page.Domain)))
	b.WriteString("      <Stack spacing={2} sx={{ mt: 3 }}>\n")
	for _, s := range page.Sections {
		switch s.Type {
		case "statsGrid":
			b.WriteString("        <Grid container spacing={2}>\n")
			for _, item := range s.Items {
				b.WriteString("          <Grid item xs={12} sm={6} md={3}>\n")
				b.WriteString("            <Card variant=\"outlined\"><CardContent>\n")
				b.WriteString(fmt.Sprintf("              <Typography variant=\"body2\" color=\"text.secondary\">%s</Typography>\n", escape(item.Label)))
				b.WriteString(fmt.Sprintf("              <Typography variant=\"h5\">%s</Typography>\n", escape(item.Value)))
				b.WriteString("            </CardContent></Card>\n          </Grid>\n")
			}
			b.WriteString("        </Grid>\n")
		case "dataTable":
			b.WriteString("        <Paper variant=\"outlined\">\n")
			b.WriteString(fmt.Sprintf("          <Typography variant=\"subtitle1\" sx={{ p: 2 }}>%s</Typography>\n", escape(s.Title)))
			b.WriteString("          <Table size=\"small\"><TableHead><TableRow>\n")
			for _, c := range s.Columns {
				b.WriteString(fmt.Sprintf("            <TableCell>%s</TableCell>\n", escape(c)))
			}
			b.WriteString("          </TableRow></TableHead><TableBody>\n")
			for _, row := range s.Rows {
				b.WriteString("            <TableRow>\n")
				for _, cell := range row {
					b.WriteString(fmt.Sprintf("              <TableCell>%s</TableCell>\n", escape(cell)))
				}
				b.WriteString("            </TableRow>\n")
			}
			b.WriteString("          </TableBody></Table>\n        </Paper>\n")
		case "chartPanel":
			b.WriteString("        <Card variant=\"outlined\"><CardContent>\n")
			b.WriteString(fmt.Sprintf("          <Typography variant=\"subtitle1\">%s</Typography>\n", escape(s.Title)))
			b.WriteString("          <Box sx={{ height: 220, mt: 2, borderRadius: 1, background: \"linear-gradient(180deg,#e3f2fd,#fff)\" }} />\n")
			b.WriteString("        </CardContent></Card>\n")
		default:
			b.WriteString("        <Card variant=\"outlined\"><CardContent>\n")
			b.WriteString(fmt.Sprintf("          <Typography variant=\"subtitle1\">%s</Typography>\n", escape(sectionTitle(s))))
			b.WriteString("        </CardContent></Card>\n")
		}
	}
	b.WriteString("      </Stack>\n    </Box>\n  );\n}\n")
	return b.String()
}

func generateChakra(page schema.PageSchema) string {
	var b strings.Builder
	b.WriteString("\"use client\";\n\n")
	b.WriteString("import { Box, Card, CardBody, Heading, SimpleGrid, Stack, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr } from \"@chakra-ui/react\";\n\n")
	b.WriteString(fmt.Sprintf("export default function %s() {\n", componentName(page)))
	b.WriteString("  return (\n")
	b.WriteString("    <Box p={6} bg=\"gray.50\" minH=\"100vh\">\n")
	b.WriteString(fmt.Sprintf("      <Heading size=\"lg\">%s</Heading>\n", escape(page.Title)))
	b.WriteString(fmt.Sprintf("      <Text color=\"gray.500\">%s dashboard generated from a validated schema.</Text>\n", title(page.Domain)))
	b.WriteString("      <Stack spacing={4} mt={6}>\n")
	for _, s := range page.Sections {
		switch s.Type {
		case "statsGrid":
			b.WriteString("        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>\n")
			for _, item := range s.Items {
				b.WriteString("          <Card><CardBody>\n")
				b.WriteString(fmt.Sprintf("            <Stat><StatLabel>%s</StatLabel><StatNumber>%s</StatNumber></Stat>\n", escape(item.Label), escape(item.Value)))
				b.WriteString("          </CardBody></Card>\n")
			}
			b.WriteString("        </SimpleGrid>\n")
		case "dataTable":
			b.WriteString("        <Card><CardBody>\n")
			b.WriteString(fmt.Sprintf("          <Heading size=\"sm\" mb={3}>%s</Heading>\n", escape(s.Title)))
			b.WriteString("          <Table size=\"sm\"><Thead><Tr>\n")
			for _, c := range s.Columns {
				b.WriteString(fmt.Sprintf("            <Th>%s</Th>\n", escape(c)))
			}
			b.WriteString("          </Tr></Thead><Tbody>\n")
			for _, row := range s.Rows {
				b.WriteString("            <Tr>\n")
				for _, cell := range row {
					b.WriteString(fmt.Sprintf("              <Td>%s</Td>\n", escape(cell)))
				}
				b.WriteString("            </Tr>\n")
			}
			b.WriteString("          </Tbody></Table>\n        </CardBody></Card>\n")
		case "chartPanel":
			b.WriteString("        <Card><CardBody>\n")
			b.WriteString(fmt.Sprintf("          <Heading size=\"sm\">%s</Heading>\n", escape(s.Title)))
			b.WriteString("          <Box h=\"220px\" mt={4} borderRadius=\"md\" bgGradient=\"linear(to-b, teal.50, white)\" />\n")
			b.WriteString("        </CardBody></Card>\n")
		default:
			b.WriteString("        <Card><CardBody>\n")
			b.WriteString(fmt.Sprintf("          <Heading size=\"sm\">%s</Heading>\n", escape(sectionTitle(s))))
			b.WriteString("        </CardBody></Card>\n")
		}
	}
	b.WriteString("      </Stack>\n    </Box>\n  );\n}\n")
	return b.String()
}

func sectionTitle(s schema.Section) string {
	if strings.TrimSpace(s.Title) != "" {
		return s.Title
	}
	return title(s.Type)
}
