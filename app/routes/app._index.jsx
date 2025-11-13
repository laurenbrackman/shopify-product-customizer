import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "setup-metafields") {
    // Define the metafields we need
    const metafieldsToCreate = [
      {
        namespace: "custom",
        key: "mockup_photos",
        name: "Mockup Photos",
        description: "Mockup photos for hat customizer",
        type: "list.file_reference",
        ownerType: "PRODUCT",
      },
      {
        namespace: "custom",
        key: "height",
        name: "Height",
        description: "Product height in inches for hat customizer scaling",
        type: "dimension",
        ownerType: "PRODUCT",
      },
      {
        namespace: "custom",
        key: "width",
        name: "Width",
        description: "Product width in inches for hat customizer scaling",
        type: "dimension",
        ownerType: "PRODUCT",
      },
    ];

    const results = [];
    const errors = [];

    for (const metafield of metafieldsToCreate) {
      try {
        const response = await admin.graphql(
          `#graphql
          mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
              createdDefinition {
                id
                name
                namespace
                key
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              definition: metafield,
            },
          },
        );

        const responseJson = await response.json();
        const data = responseJson.data?.metafieldDefinitionCreate;

        if (data?.userErrors?.length > 0) {
          // Check if error is "already exists"
          const alreadyExists = data.userErrors.some(
            (err) => err.message.includes("taken") || err.message.includes("Key is in use")
          );
          if (alreadyExists) {
            results.push({
              ...metafield,
              status: "exists",
            });
          } else {
            errors.push({
              ...metafield,
              error: data.userErrors[0].message,
            });
          }
        } else if (data?.createdDefinition) {
          results.push({
            ...metafield,
            status: "created",
            id: data.createdDefinition.id,
          });
        }
      } catch (err) {
        errors.push({
          ...metafield,
          error: err.message,
        });
      }
    }

    return {
      action: "setup-metafields",
      results,
      errors,
      success: errors.length === 0,
    };
  }

  return { error: "Unknown action" };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.action === "setup-metafields" && fetcher.data?.success) {
      const created = fetcher.data.results.filter(r => r.status === "created").length;
      const existing = fetcher.data.results.filter(r => r.status === "exists").length;
      
      if (existing === 3 && created === 0) {
        shopify.toast.show("You're already set up! All metafields exist.");
      } else if (created > 0 && existing > 0) {
        shopify.toast.show(`Created ${created} metafield(s), ${existing} already existed`);
      } else if (created > 0) {
        shopify.toast.show(`Successfully created ${created} metafield(s)`);
      }
    } else if (fetcher.data?.errors && fetcher.data.errors.length > 0) {
      shopify.toast.show("Error creating metafields", { isError: true });
    }
  }, [fetcher.data, shopify]);

  const setupMetafields = () => {
    const formData = new FormData();
    formData.append("action", "setup-metafields");
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page>
      <ui-title-bar title="Hat Customizer App" />

      <s-section heading="Welcome to Your Hat Customizer App!">
        <s-paragraph>
          This app allows customers to create custom hats by adding patches and designs directly on product pages. 
          Customers can drag and drop patches, position them, rotate them, and layer them to create their perfect custom hat.
        </s-paragraph>
        <s-paragraph>
          The app uses a theme extension that integrates seamlessly with your product pages. 
          To get started, make sure you have:
        </s-paragraph>
        <s-list>
          <li>A hat product with a mockup image under the transparent_image metafield</li>
          <li>A collection of patch products, each with transparent_image, height, and width metafields</li>
          <li>The Product Customizer block added to your product page template</li>
        </s-list>
        <s-paragraph>
          This app was created by{" "}
          <s-link
            href="https://www.laurenbrackman.com"
            target="_blank"
          >
            Lauren Brackman Websites
          </s-link>.
        </s-paragraph>
      </s-section>

      <s-section heading="Setup">
        <s-paragraph>
          Click the button below to create the required custom metafield definitions for your products. 
          These metafields store transparent images, heights, and widths needed for the hat customizer.
        </s-paragraph>
        <s-button
          onClick={setupMetafields}
          {...(isLoading ? { loading: true } : {})}
        >
          Setup Metafields
        </s-button>
        {fetcher.data?.action === "setup-metafields" && fetcher.data?.success && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
            style={{ marginTop: "1rem" }}
          >
            {(() => {
              const created = fetcher.data.results.filter(r => r.status === "created").length;
              const existing = fetcher.data.results.filter(r => r.status === "exists").length;
              
              if (existing === 3 && created === 0) {
                return <s-paragraph>✓ You're all set! All required metafields are already configured.</s-paragraph>;
              }
              
              return (
                <s-stack direction="block" gap="base">
                  {fetcher.data.results.filter(r => r.status === "created").map((result, i) => (
                    <s-paragraph key={i}>
                      ✓ <s-text weight="bold">{result.name}</s-text> Metafield Created
                    </s-paragraph>
                  ))}
                </s-stack>
              );
            })()}
          </s-box>
        )}
        {fetcher.data?.action === "setup-metafields" && fetcher.data?.errors?.length > 0 && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
            style={{ marginTop: "1rem" }}
          >
            <s-stack direction="block" gap="base">
              {fetcher.data.errors.map((error, i) => (
                <s-paragraph key={i}>
                  ✗ <s-text weight="bold">{error.name}</s-text> - Error: {error.error}
                </s-paragraph>
              ))}
            </s-stack>
          </s-box>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
